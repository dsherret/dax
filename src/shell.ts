import { instantiate } from "../lib/rs_lib.generated.js";
import { cdCommand } from "./commands/cd.ts";
import { echoCommand } from "./commands/echo.ts";
import { exportCommand } from "./commands/export.ts";
import { sleepCommand } from "./commands/sleep.ts";
import { DenoWhichRealEnvironment, path, which } from "./deps.ts";
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
  name: string;
  value: StringOrWord;
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

export type BooleanListOperator = "and" | "or";

export interface BooleanList {
  kind: "booleanList";
  current: Sequence;
  op: BooleanListOperator;
  next: Sequence;
}

interface Env {
  setCwd(cwd: string): void;
  getCwd(): string;
  setEnvVar(key: string, value: string | undefined): void;
  getEnvVar(key: string): string | undefined;
  getEnvVars(): Record<string, string>;
  clone(): Env;
}

class RealEnv implements Env {
  setCwd(cwd: string) {
    Deno.chdir(cwd);
  }

  getCwd() {
    return Deno.cwd();
  }

  setEnvVar(key: string, value: string | undefined) {
    if (value == null) {
      Deno.env.delete(key);
    } else {
      Deno.env.set(key, value);
    }
  }

  getEnvVar(key: string) {
    return Deno.env.get(key);
  }

  getEnvVars() {
    return Deno.env.toObject();
  }

  clone(): Env {
    return new ShellEnv({
      cwd: this.getCwd(),
      env: this.getEnvVars(),
    });
  }
}

interface ShellEnvOpts {
  cwd: string;
  env: {
    [key: string]: string;
  };
}

class ShellEnv implements Env {
  #cwd: string;
  #envVars: Record<string, string> = {};

  constructor(opts: ShellEnvOpts) {
    this.#cwd = opts.cwd;

    // ensure the env vars are normalized
    for (const [key, value] of Object.entries(opts.env)) {
      this.setEnvVar(key, value);
    }
  }

  setCwd(cwd: string) {
    this.#cwd = cwd;
  }

  getCwd(): string {
    return this.#cwd;
  }

  setEnvVar(key: string, value: string | undefined) {
    if (Deno.build.os === "windows") {
      key = key.toUpperCase();
    }
    if (value == null || value.length === 0) {
      delete this.#envVars[key];
    } else {
      this.#envVars[key] = value;
    }
  }

  getEnvVar(key: string) {
    if (Deno.build.os === "windows") {
      key = key.toUpperCase();
    }
    return this.#envVars[key];
  }

  getEnvVars() {
    return { ...this.#envVars };
  }

  clone() {
    return new ShellEnv({
      cwd: this.#cwd,
      env: { ...this.#envVars },
    });
  }
}

class Context {
  stdin: ShellPipeReader;
  stdout: ShellPipeWriter;
  stderr: ShellPipeWriter;
  #env: Env;
  #shellVars: Record<string, string>;
  #signal: AbortSignal;

  constructor(opts: {
    stdin: ShellPipeReader;
    stdout: ShellPipeWriter;
    stderr: ShellPipeWriter;
    env: Env;
    shellVars: Record<string, string>;
    signal: AbortSignal;
  }) {
    this.stdin = opts.stdin;
    this.stdout = opts.stdout;
    this.stderr = opts.stderr;
    this.#env = opts.env;
    this.#shellVars = opts.shellVars;
    this.#signal = opts.signal;
  }

  get signal() {
    return this.#signal;
  }

  applyChanges(changes: EnvChange[] | undefined) {
    if (changes == null) {
      return;
    }
    for (const change of changes) {
      switch (change.kind) {
        case "cd":
          this.#env.setCwd(change.dir);
          break;
        case "envvar":
          this.setEnvVar(change.name, change.value);
          break;
        case "shellvar":
          this.setShellVar(change.name, change.value);
          break;
        default:
          const _assertNever: never = change;
          throw new Error(`Not implemented env change: ${change}`);
      }
    }
  }

  setEnvVar(key: string, value: string | undefined) {
    if (Deno.build.os === "windows") {
      key = key.toUpperCase();
    }
    if (key === "PWD") {
      if (value != null && path.isAbsolute(value)) {
        this.#env.setCwd(path.resolve(value));
      }
    } else {
      delete this.#shellVars[key];
      this.#env.setEnvVar(key, value);
    }
  }

  setShellVar(key: string, value: string | undefined) {
    if (Deno.build.os === "windows") {
      key = key.toUpperCase();
    }
    if (this.#env.getEnvVar(key) != null || key === "PWD") {
      this.setEnvVar(key, value);
    } else {
      if (value == null || value.length === 0) {
        delete this.#shellVars[key];
      } else {
        this.#shellVars[key] = value;
      }
    }
  }

  getEnvVars() {
    return this.#env.getEnvVars();
  }

  getCwd() {
    return this.#env.getCwd();
  }

  getVar(key: string) {
    if (Deno.build.os === "windows") {
      key = key.toUpperCase();
    }
    if (key === "PWD") {
      return this.#env.getCwd();
    }
    return this.#env.getEnvVar(key) ?? this.#shellVars[key];
  }

  clone() {
    return new Context({
      stdin: this.stdin,
      stdout: this.stdout,
      stderr: this.stderr,
      env: this.#env.clone(),
      shellVars: { ...this.#shellVars },
      signal: this.#signal,
    });
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
  env: Record<string, string>;
  cwd: string;
  exportEnv: boolean;
  signal: AbortSignal;
}

export async function spawn(list: SequentialList, opts: SpawnOpts) {
  const context = new Context({
    env: opts.exportEnv ? new RealEnv() : new ShellEnv(opts),
    stdin: opts.stdin,
    stdout: opts.stdout,
    stderr: opts.stderr,
    shellVars: {},
    signal: opts.signal,
  });
  const result = await executeSequentialList(list, context);
  return result.code;
}

async function executeSequentialList(list: SequentialList, context: Context): Promise<ExecuteResult> {
  let finalExitCode = 0;
  let finalChanges = [];
  for (const item of list.items) {
    if (item.isAsync) {
      throw new Error("Async commands are not supported. Run a command concurrently in the JS code instead.");
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
  if (context.signal.aborted) {
    return Promise.resolve(getAbortedResult());
  }
  switch (sequence.kind) {
    case "pipeline":
      return executePipeline(sequence, context);
    case "booleanList":
      return executeBooleanList(sequence, context);
    case "shellVar":
      return executeShellVar(sequence, context);
    default:
      const _assertNever: never = sequence;
      throw new Error(`Not implemented: ${sequence}`);
  }
}

function executePipeline(pipeline: Pipeline, context: Context): Promise<ExecuteResult> {
  if (pipeline.negated) {
    throw new Error("Negated pipelines are not implemented.");
  }
  return executePipelineInner(pipeline.inner, context);
}

async function executeBooleanList(list: BooleanList, context: Context): Promise<ExecuteResult> {
  const changes = [];
  // handle first result
  const firstResult = await executeSequence(
    list.current,
    context.clone(),
  );
  let exitCode = 0;
  switch (firstResult.kind) {
    case "exit":
      return firstResult;
    case "continue":
      if (firstResult.changes) {
        context.applyChanges(firstResult.changes);
        changes.push(...firstResult.changes);
      }
      exitCode = firstResult.code;
      break;
    default:
      const _assertNever: never = firstResult;
      throw new Error("Not handled.");
  }

  const next = findNextSequence(list, exitCode);
  if (next == null) {
    return {
      kind: "continue",
      code: exitCode,
      changes,
    };
  } else {
    const nextResult = await executeSequence(
      next,
      context.clone(),
    );
    switch (nextResult.kind) {
      case "exit":
        return firstResult;
      case "continue":
        if (nextResult.changes) {
          changes.push(...nextResult.changes);
        }
        return {
          kind: "continue",
          code: nextResult.code,
          changes,
        };
      default:
        const _assertNever: never = nextResult;
        throw new Error("Not Implemented");
    }
  }

  function findNextSequence(current: BooleanList, exitCode: number) {
    if (opMovesNextForExitCode(current.op, exitCode)) {
      return current.next;
    } else {
      let next = current.next;
      while (next.kind === "booleanList") {
        if (opMovesNextForExitCode(next.op, exitCode)) {
          return next.next;
        } else {
          next = next.next;
        }
      }
      return undefined;
    }
  }

  function opMovesNextForExitCode(op: BooleanListOperator, exitCode: number) {
    switch (op) {
      case "or":
        return exitCode !== 0;
      case "and":
        return exitCode === 0;
    }
  }
}

async function executeShellVar(sequence: ShellVar, context: Context): Promise<ExecuteResult> {
  const value = await evaluateStringOrWord(sequence.value, context);
  return {
    kind: "continue",
    code: 0,
    changes: [{
      kind: "shellvar",
      name: sequence.name,
      value,
    }],
  };
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
    throw new Error("Redirects are not supported. Pipe in the JS code instead using the methods on commands.");
  }
  return executeCommandInner(command.inner, context);
}

function executeCommandInner(command: CommandInner, context: Context): Promise<ExecuteResult> {
  switch (command.kind) {
    case "simple":
      return executeSimpleCommand(command, context);
    case "sequentialList":
    default:
      throw new Error(`Not implemented: ${command.kind}`);
  }
}

async function executeSimpleCommand(command: SimpleCommand, parentContext: Context) {
  const context = parentContext.clone();
  for (const envVar of command.envVars) {
    context.setEnvVar(envVar.name, await evaluateStringOrWord(envVar.value, context));
  }
  const commandArgs = await evaluateArgs(command.args, context);
  return await executeCommandArgs(commandArgs, context);
}

async function executeCommandArgs(commandArgs: string[], context: Context) {
  if (commandArgs[0] === "cd") {
    return await cdCommand(context.getCwd(), commandArgs.slice(1), context.stderr);
  } else if (commandArgs[0] === "echo") {
    return await echoCommand(commandArgs.slice(1), context.stdout);
  } else if (commandArgs[0] === "export") {
    return await exportCommand(commandArgs.slice(1));
  } else if (commandArgs[0] === "sleep") {
    return await sleepCommand(commandArgs.slice(1), context.stderr);
  } else {
    const commandPath = await resolveCommand(commandArgs[0], context);
    const p = Deno.run({
      cmd: [commandPath, ...commandArgs.slice(1)],
      cwd: context.getCwd(),
      env: context.getEnvVars(),
      stdin: getStdioStringValue(context.stdin),
      stdout: getStdioStringValue(context.stdout.kind),
      stderr: getStdioStringValue(context.stderr.kind),
    });
    const abortListener = () => p.kill("SIGKILL");
    context.signal.addEventListener("abort", abortListener);
    const completeController = new AbortController();
    const completeSignal = completeController.signal;
    try {
      // ignore the result of writing to stdin because it may
      // have not finished before the process finished
      const _ignore = writeStdin(context.stdin, p, completeSignal);
      const readStdoutTask = readStdOutOrErr(p.stdout, context.stdout);
      const readStderrTask = readStdOutOrErr(p.stderr, context.stderr);
      const [status] = await Promise.all([
        p.status(),
        readStdoutTask,
        readStderrTask,
      ]);
      if (context.signal.aborted) {
        return getAbortedResult();
      } else {
        return resultFromCode(status.code);
      }
    } finally {
      completeController.abort();
      context.signal.removeEventListener("abort", abortListener);
      p.close();
      p.stdin?.close();
      p.stdout?.close();
      p.stderr?.close();
    }
  }

  async function writeStdin(stdin: ShellPipeReader, p: Deno.Process, signal: AbortSignal) {
    if (typeof stdin === "string") {
      return;
    }
    await pipeReaderToWriter(stdin, p.stdin!, signal);
  }

  async function readStdOutOrErr(reader: Deno.Reader | null, writer: ShellPipeWriter) {
    if (typeof writer === "string" || reader == null) {
      return;
    }
    // don't abort... ensure all of stdout/stderr is read in case the process
    // exits before this finishes
    await pipeReaderToWriter(reader, writer, new AbortController().signal);
  }

  async function pipeReaderToWriter(reader: Deno.Reader, writer: Deno.Writer, signal: AbortSignal) {
    while (!signal.aborted) {
      const buffer = new Uint8Array(1024);
      const length = await reader.read(buffer);
      if (length === 0 || length == null) {
        break;
      }
      await writeAll(buffer.subarray(0, length));
    }

    async function writeAll(arr: Uint8Array) {
      let nwritten = 0;
      while (nwritten < arr.length && !signal.aborted) {
        nwritten += await writer.write(arr.subarray(nwritten));
      }
    }
  }

  function getStdioStringValue(value: ShellPipeReader | ShellPipeWriterKind) {
    if (value === "default") {
      return "piped";
    } else if (value === "inherit" || value === "null" || value === "piped") {
      return value;
    } else {
      return "piped";
    }
  }
}

async function resolveCommand(commandName: string, context: Context) {
  const realEnvironment = new DenoWhichRealEnvironment();
  if (commandName.includes("/") || commandName.includes("\\")) {
    if (!path.isAbsolute(commandName)) {
      commandName = path.relative(context.getCwd(), commandName);
    }
    if (await realEnvironment.fileExists(commandName)) {
      return commandName;
    } else {
      throw new Error(`Command not found: ${commandName}`);
    }
  }

  // always use the current executable for "deno"
  if (commandName.toUpperCase() === "DENO") {
    return Deno.execPath();
  }

  const commandPath = await which(commandName, {
    os: Deno.build.os,
    fileExists(path: string) {
      return realEnvironment.fileExists(path);
    },
    env(key) {
      return context.getVar(key);
    },
  });
  if (commandPath == null) {
    throw new Error(`Command not found: ${commandName}`);
  }
  return commandPath;
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

async function evaluateStringOrWord(stringOrWord: StringOrWord, context: Context) {
  const result = await evaluateStringParts(stringOrWord.value, context);
  return result.join(" ");
}

async function evaluateStringParts(stringParts: StringPart[], context: Context) {
  // not implemented mostly, and copying from deno_task_shell
  const result: string[] = [];
  let currentText = "";
  for (const stringPart of stringParts) {
    let evaluationResult: string | undefined = undefined;
    switch (stringPart.kind) {
      case "text":
        currentText += stringPart.value;
        break;
      case "variable":
        evaluationResult = context.getVar(stringPart.value); // value is name
        break;
      case "command":
      default:
        throw new Error(`Not implemented: ${stringPart.kind}`);
    }

    if (evaluationResult != null) {
      const parts = evaluationResult.split(" ")
        .map(t => t.trim())
        .filter(t => t.length > 0);
      if (parts.length > 0) {
        // append the first part to the current text
        currentText += parts[0];

        // store the current text
        result.push(currentText);

        // store all the rest of the parts
        result.push(...parts.slice(1));

        // use the last part as the current text so it maybe
        // gets appended to in the future
        currentText = result.pop()!;
      }
    }
  }
  if (currentText.length !== 0) {
    result.push(currentText);
  }
  return result;
}

function getAbortedResult(): ExecuteResult {
  return {
    kind: "exit",
    code: 124, // same as timeout command
  };
}
