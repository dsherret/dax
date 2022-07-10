import { instantiate } from "../lib/rs_lib.generated.js";
import { cdCommand } from "./commands/cd.ts";
import { ShellPipeReader, ShellPipeWriter, ShellPipeWriterKind } from "./pipes.ts";
import { EnvChange, ExecuteResult, resultFromCode } from "./result.ts";

export interface SequentialList {
  items: SequentialListItem[];
}

export interface SequentialListItem {
  isAsync: boolean;
  sequence: Sequence;
}

export type Sequence = ShellVar | Pipeline | BooleanList;

export interface ShellVar extends EnvVar {
  kind: "shellVar";
}

export interface EnvVar {
  // todo...
}

export interface Pipeline {
  kind: "pipeline";
  negated: boolean;
  inner: PipelineInner;
}

export type PipelineInner = Command | PipeSequence;

export interface Command {
  kind: "command";
  inner: CommandInner;
  redirect: Redirect | undefined;
}

export type CommandInner = SimpleCommand | TaggedSequentialList;

export interface SimpleCommand {
  kind: "simple";
  envVars: EnvVar[];
  args: StringOrWord[];
}

export type StringOrWord = Word | StringOrWordString;

export interface Word {
  kind: "word";
  value: StringPart[];
}

export interface StringOrWordString {
  kind: "string";
  value: StringPart[];
}

export type StringPart = Text | Variable | StringPartCommand;

export interface Text {
  kind: "text";
  value: string;
}

export interface Variable {
  kind: "variable";
  value: string;
}

export interface StringPartCommand {
  kind: "command";
  value: SequentialList;
}

export interface TaggedSequentialList extends SequentialList {
  kind: "sequentialList";
}

export interface Redirect {
  // todo...
}

export interface PipeSequence {
  kind: "pipeSequence";
  // todo...
}

export interface BooleanList {
  kind: "booleanList";
  // todo...
}

class Context {
  stdin: ShellPipeReader;
  stdout: ShellPipeWriter;
  stderr: ShellPipeWriter;
  cwd: string;
  env: {
    [key: string]: string;
  };

  constructor(opts: {
    stdin: ShellPipeReader;
    stdout: ShellPipeWriter;
    stderr: ShellPipeWriter;
  }) {
    this.stdin = opts.stdin;
    this.stdout = opts.stdout;
    this.stderr = opts.stderr;
    // todo: configurable
    this.cwd = Deno.cwd();
    this.env = Deno.env.toObject();
  }

  applyChanges(changes: EnvChange[]) {
    for (const change of changes) {
      switch (change.kind) {
        case "cd":
          this.cwd = change.dir;
          break;
        case "envvar":
        case "shellvar":
        default:
          throw new Error(`Not implemented env change: ${change.kind}`);
      }
    }
  }
}

export async function parseArgs(command: string) {
  const { parse } = await instantiate();
  return parse(command) as SequentialList;
}

export interface SpawnOpts {
  stdin: ShellPipeReader;
  stdout: ShellPipeWriter;
  stderr: ShellPipeWriter;
}

export async function spawn(list: SequentialList, opts: SpawnOpts) {
  const context = new Context(opts);
  const result = await executeSequentialList(list, context);
  return result.code;
}

async function executeSequentialList(list: SequentialList, context: Context): Promise<ExecuteResult> {
  let finalExitCode = 0;
  let finalChanges = [];
  for (const item of list.items) {
    if (item.isAsync) {
      throw new Error("Async commands are not implemented.");
    }
    const result = await executeSequence(item.sequence, context);
    switch (result.kind) {
      case "continue":
        if (result.changes) {
          context.applyChanges(result.changes);
          finalChanges.push(...result.changes);
        }
        finalExitCode = result.code;
        break;
      case "exit":
        return result;
      default:
        const _assertNever: never = result;
    }
  }
  return {
    kind: "continue",
    code: finalExitCode,
    changes: finalChanges,
  };
}

function executeSequence(sequence: Sequence, context: Context): Promise<ExecuteResult> {
  switch (sequence.kind) {
    case "pipeline":
      return executePipeline(sequence, context);
    case "booleanList":
    case "shellVar":
    default:
      throw new Error(`Not implemented: ${sequence.kind}`);
  }
}

function executePipeline(pipeline: Pipeline, context: Context): Promise<ExecuteResult> {
  if (pipeline.negated) {
    throw new Error("Negated pipelines are not implemented.");
  }
  return executePipelineInner(pipeline.inner, context);
}

function executePipelineInner(inner: PipelineInner, context: Context): Promise<ExecuteResult> {
  switch (inner.kind) {
    case "command":
      return executeCommand(inner, context);
    case "pipeSequence":
      throw new Error(`Not implemented: ${inner.kind}`);
  }
}

function executeCommand(command: Command, context: Context): Promise<ExecuteResult> {
  if (command.redirect != null) {
    throw new Error("Redirects are not implemented.");
  }
  return executeCommandInner(command.inner, context);
}

async function executeCommandInner(command: CommandInner, context: Context): Promise<ExecuteResult> {
  switch (command.kind) {
    case "simple":
      if (command.envVars.length > 0) {
        throw new Error("Env vars on commands are not implemented.");
      }
      const commandArgs = await evaluateArgs(command.args, context);
      if (commandArgs[0] === "cd") {
        return await cdCommand(context.cwd, commandArgs.slice(1), context.stderr);
      } else {
        const p = Deno.run({
          cmd: commandArgs,
          cwd: context.cwd,
          env: context.env,
          stdin: getStdioStringValue(context.stdin),
          stdout: getStdioStringValue(context.stdout.kind),
          stderr: getStdioStringValue(context.stderr.kind),
        });
        try {
          const writeStdinTask = writeStdin(context.stdin, p);
          const readStdoutTask = readStdOutOrErr(p.stdout, context.stdout);
          const readStderrTask = readStdOutOrErr(p.stderr, context.stderr);
          const [status] = await Promise.all([
            p.status(),
            writeStdinTask,
            readStdoutTask,
            readStderrTask,
          ]);
          return resultFromCode(status.code);
        } finally {
          p.close();
          p.stdout?.close();
          p.stderr?.close();
        }
      }
    case "sequentialList":
    default:
      throw new Error(`Not implemented: ${command.kind}`);
  }

  async function writeStdin(stdin: ShellPipeReader, p: Deno.Process) {
    if (typeof stdin === "string") {
      return;
    }
    await pipeReaderToWriter(stdin, p.stdin!);
  }

  async function readStdOutOrErr(reader: Deno.Reader | null, writer: ShellPipeWriter) {
    if (typeof writer === "string" || reader == null) {
      return;
    }
    await pipeReaderToWriter(reader, writer);
  }

  async function pipeReaderToWriter(reader: Deno.Reader, writer: Deno.Writer) {
    while (true) {
      const buffer = new Uint8Array(1024);
      const length = await reader.read(buffer);
      if (length === 0 || length == null) {
        break;
      }
      await writer.write(buffer.subarray(0, length));
    }
  }

  function getStdioStringValue(value: ShellPipeReader | ShellPipeWriterKind) {
    if (value === "inherit" || value === "null") {
      return value;
    }
    return "piped";
  }
}

async function evaluateArgs(stringOrWords: StringOrWord[], context: Context) {
  const result = [];
  for (const stringOrWord of stringOrWords) {
    switch (stringOrWord.kind) {
      case "word":
        result.push(...await evaluateStringParts(stringOrWord.value, context));
        break;
      case "string":
        result.push((await evaluateStringParts(stringOrWord.value, context)).join(" "));
        break;
      default:
        const _assertNever: never = stringOrWord;
        throw new Error(`Not implemented: ${(stringOrWord as any).kind}`);
    }
  }
  return result;
}

async function evaluateStringParts(stringParts: StringPart[], context: Context) {
  // not implemented mostly, and copying from deno_task_shell
  const result: string[] = [];
  let currentText = "";
  for (const stringPart of stringParts) {
    switch (stringPart.kind) {
      case "text":
        currentText += stringPart.value;
        break;
      case "variable":
      case "command":
      default:
        throw new Error(`Not implemented: ${stringPart.kind}`);
    }
  }
  if (currentText.length !== 0) {
    result.push(currentText);
  }
  return result;
}

// todo: remove and replace with above
export function parseArgsOld(command: string) {
  const args: string[] = [];
  let current = "";
  for (let i = 0; i < command.length; i++) {
    let char = command[i];
    if (char === "'" || char === "\"") {
      const startChar = char;
      i++;
      for (; i < command.length; i++) {
        char = command[i];
        if (char === startChar) {
          break;
        } else if (char === "\\" && command[i + 1] === startChar) {
          // skip the escaped quote
          i++;
          current += startChar;
        } else {
          current += char;
        }
      }
    } else if (char === " ") {
      checkAddArg();
    } else {
      current += char;
    }
  }

  checkAddArg();
  return args;

  function checkAddArg() {
    const arg = current.trim();
    if (arg.length > 0) {
      args.push(arg);
    }
    current = "";
  }
}
