import { KillSignal } from "./command.ts";
import { CommandContext, CommandHandler, type CommandPipeReader } from "./command_handler.ts";
import { getExecutableShebangFromPath, ShebangInfo } from "./common.ts";
import { DenoWhichRealEnvironment, fs, path, which } from "./deps.ts";
import { wasmInstance } from "./lib/mod.ts";
import {
  NullPipeReader,
  NullPipeWriter,
  PipeSequencePipe,
  PipeWriter,
  Reader,
  ShellPipeReaderKind,
  ShellPipeWriter,
  ShellPipeWriterKind,
} from "./pipes.ts";
import { EnvChange, ExecuteResult, getAbortedResult } from "./result.ts";

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
  value: Word;
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
  args: Word[];
}

export type Word = WordPart[];

export type WordPart = Text | Variable | StringPartCommand | Quoted;

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

export interface Quoted {
  kind: "quoted";
  value: WordPart[];
}

export interface TaggedSequentialList extends SequentialList {
  kind: "sequentialList";
}

export interface PipeSequence {
  kind: "pipeSequence";
  current: Command;
  op: PipeSequenceOp;
  next: PipelineInner;
}

export type PipeSequenceOp = "stdout" | "stdoutstderr";

export type RedirectFd = RedirectFdFd | RedirectFdStdoutStderr;

export interface RedirectFdFd {
  kind: "fd";
  fd: number;
}

export interface RedirectFdStdoutStderr {
  kind: "stdoutStderr";
}

export type RedirectOp = RedirectOpInput | RedirectOpOutput;
export interface RedirectOpInput {
  kind: "input";
  value: "redirect";
}
export interface RedirectOpOutput {
  kind: "output";
  value: "overwrite" | "append";
}

export interface Redirect {
  maybeFd: RedirectFd | undefined;
  op: RedirectOp;
  ioFile: IoFile;
}

export type IoFile = IoFileWord | IoFileFd;

export interface IoFileWord {
  kind: "word";
  value: Word;
}

export interface IoFileFd {
  kind: "fd";
  value: number;
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
    return cloneEnv(this);
  }
}

interface ShellEnvOpts {
  cwd: string;
  env: {
    [key: string]: string;
  };
}

class ShellEnv implements Env {
  #cwd: string | undefined;
  #envVars: Record<string, string> = {};

  setCwd(cwd: string) {
    this.#cwd = cwd;
  }

  getCwd(): string {
    if (this.#cwd == null) {
      throw new Error("The cwd must be initialized.");
    }
    return this.#cwd;
  }

  setEnvVar(key: string, value: string | undefined) {
    if (Deno.build.os === "windows") {
      key = key.toUpperCase();
    }
    if (value == null) {
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
    return cloneEnv(this);
  }
}

function initializeEnv(env: Env, opts: ShellEnvOpts) {
  env.setCwd(opts.cwd);
  for (const [key, value] of Object.entries(opts.env)) {
    env.setEnvVar(key, value);
  }
}

function cloneEnv(env: Env) {
  const result = new ShellEnv();
  initializeEnv(result, {
    cwd: env.getCwd(),
    env: env.getEnvVars(),
  });
  return result;
}

export class StreamFds {
  #readers = new Map<number, () => Reader>();
  #writers = new Map<number, () => PipeWriter>();

  insertReader(fd: number, stream: () => Reader) {
    this.#readers.set(fd, stream);
  }

  insertWriter(fd: number, stream: () => PipeWriter) {
    this.#writers.set(fd, stream);
  }

  getReader(fd: number): Reader | undefined {
    return this.#readers.get(fd)?.();
  }

  getWriter(fd: number): PipeWriter | undefined {
    return this.#writers.get(fd)?.();
  }
}

interface ContextOptions {
  stdin: CommandPipeReader;
  stdout: ShellPipeWriter;
  stderr: ShellPipeWriter;
  env: Env;
  shellVars: Record<string, string>;
  static: StaticContextState;
}

/** State that never changes across the entire execution of the shell. */
interface StaticContextState {
  signal: KillSignal;
  commands: Record<string, CommandHandler>;
  fds: StreamFds | undefined;
}

export class Context {
  stdin: CommandPipeReader;
  stdout: ShellPipeWriter;
  stderr: ShellPipeWriter;
  #env: Env;
  #shellVars: Record<string, string>;
  #static: StaticContextState;

  constructor(opts: ContextOptions) {
    this.stdin = opts.stdin;
    this.stdout = opts.stdout;
    this.stderr = opts.stderr;
    this.#env = opts.env;
    this.#shellVars = opts.shellVars;
    this.#static = opts.static;
  }

  get signal() {
    return this.#static.signal;
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
        case "unsetvar":
          this.setShellVar(change.name, undefined);
          this.setEnvVar(change.name, undefined);
          break;
        default: {
          const _assertNever: never = change;
          throw new Error(`Not implemented env change: ${change}`);
        }
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
    } else if (value == null) {
      delete this.#shellVars[key];
    } else {
      this.#shellVars[key] = value;
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

  getCommand(command: string) {
    return this.#static.commands[command] ?? null;
  }

  getFdReader(fd: number) {
    return this.#static.fds?.getReader(fd);
  }

  getFdWriter(fd: number) {
    return this.#static.fds?.getWriter(fd);
  }

  asCommandContext(args: string[]): CommandContext {
    const context = this;
    return {
      get args() {
        return args;
      },
      get cwd() {
        return context.getCwd();
      },
      get env() {
        return context.getEnvVars();
      },
      get stdin() {
        return context.stdin;
      },
      get stdout() {
        return context.stdout;
      },
      get stderr() {
        return context.stderr;
      },
      get signal() {
        return context.signal;
      },
      error(codeOrText: number | string, maybeText?: string): Promise<ExecuteResult> | ExecuteResult {
        return context.error(codeOrText, maybeText);
      },
    };
  }

  error(text: string): Promise<ExecuteResult> | ExecuteResult;
  error(code: number, text: string): Promise<ExecuteResult> | ExecuteResult;
  error(codeOrText: number | string, maybeText: string | undefined): Promise<ExecuteResult> | ExecuteResult;
  error(codeOrText: number | string, maybeText?: string): Promise<ExecuteResult> | ExecuteResult {
    let code: number;
    let text: string;
    if (typeof codeOrText === "number") {
      code = codeOrText;
      text = maybeText!;
    } else {
      code = 1;
      text = codeOrText;
    }
    const maybePromise = this.stderr.writeLine(text);
    if (maybePromise instanceof Promise) {
      return maybePromise.then(() => ({ code }));
    } else {
      return { code };
    }
  }

  withInner(opts: Partial<Pick<ContextOptions, "stdout" | "stderr" | "stdin">>) {
    return new Context({
      stdin: opts.stdin ?? this.stdin,
      stdout: opts.stdout ?? this.stdout,
      stderr: opts.stderr ?? this.stderr,
      env: this.#env.clone(),
      shellVars: { ...this.#shellVars },
      static: this.#static,
    });
  }

  clone() {
    return new Context({
      stdin: this.stdin,
      stdout: this.stdout,
      stderr: this.stderr,
      env: this.#env.clone(),
      shellVars: { ...this.#shellVars },
      static: this.#static,
    });
  }
}

export function parseCommand(command: string) {
  return wasmInstance.parse(command) as SequentialList;
}

export interface SpawnOpts {
  stdin: CommandPipeReader;
  stdout: ShellPipeWriter;
  stderr: ShellPipeWriter;
  env: Record<string, string>;
  commands: Record<string, CommandHandler>;
  cwd: string;
  exportEnv: boolean;
  signal: KillSignal;
  fds: StreamFds | undefined;
}

export async function spawn(list: SequentialList, opts: SpawnOpts) {
  const env = opts.exportEnv ? new RealEnv() : new ShellEnv();
  initializeEnv(env, opts);
  const context = new Context({
    env,
    stdin: opts.stdin,
    stdout: opts.stdout,
    stderr: opts.stderr,
    shellVars: {},
    static: {
      commands: opts.commands,
      fds: opts.fds,
      signal: opts.signal,
    },
  });
  const result = await executeSequentialList(list, context);
  return result.code;
}

async function executeSequentialList(list: SequentialList, context: Context): Promise<ExecuteResult> {
  let finalExitCode = 0;
  const finalChanges = [];
  for (const item of list.items) {
    if (item.isAsync) {
      throw new Error("Async commands are not supported. Run a command concurrently in the JS code instead.");
    }
    const result = await executeSequence(item.sequence, context);
    switch (result.kind) {
      case undefined:
        if (result.changes) {
          context.applyChanges(result.changes);
          finalChanges.push(...result.changes);
        }
        finalExitCode = result.code;
        break;
      case "exit":
        return result;
      default: {
        const _assertNever: never = result;
      }
    }
  }
  return {
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
    default: {
      const _assertNever: never = sequence;
      throw new Error(`Not implemented: ${sequence}`);
    }
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
    case undefined:
      if (firstResult.changes) {
        context.applyChanges(firstResult.changes);
        changes.push(...firstResult.changes);
      }
      exitCode = firstResult.code;
      break;
    default: {
      const _assertNever: never = firstResult;
      throw new Error("Not handled.");
    }
  }

  const next = findNextSequence(list, exitCode);
  if (next == null) {
    return {
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
        return nextResult;
      case undefined:
        if (nextResult.changes) {
          changes.push(...nextResult.changes);
        }
        return {
          code: nextResult.code,
          changes,
        };
      default: {
        const _assertNever: never = nextResult;
        throw new Error("Not Implemented");
      }
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
  const value = await evaluateWord(sequence.value, context);
  return {
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
      return executePipeSequence(inner, context);
    default: {
      const _assertNever: never = inner;
      throw new Error(`Not implemented: ${(inner as PipelineInner).kind}`);
    }
  }
}

async function executeCommand(command: Command, context: Context): Promise<ExecuteResult> {
  if (command.redirect != null) {
    const redirectResult = await resolveRedirectPipe(command.redirect, context);
    let redirectPipe: Reader | PipeWriter;
    if (redirectResult.kind === "input") {
      const { pipe } = redirectResult;
      context = context.withInner({
        stdin: pipe,
      });
      redirectPipe = pipe;
    } else if (redirectResult.kind === "output") {
      const { pipe, toFd } = redirectResult;
      const writer = new ShellPipeWriter("piped", pipe);
      redirectPipe = pipe;
      if (toFd === 1) {
        context = context.withInner({
          stdout: writer,
        });
      } else if (toFd === 2) {
        context = context.withInner({
          stderr: writer,
        });
      } else {
        const _assertNever: never = toFd;
        throw new Error(`Not handled fd: ${toFd}`);
      }
    } else {
      return redirectResult;
    }
    const result = await executeCommandInner(command.inner, context);
    try {
      if (isAsyncDisposable(redirectPipe)) {
        await redirectPipe[Symbol.asyncDispose]();
      } else if (isDisposable(redirectPipe)) {
        redirectPipe[Symbol.dispose]();
      }
    } catch (err) {
      if (result.code === 0) {
        return context.error(`failed disposing redirected pipe. ${err?.message ?? err}`);
      }
    }
    return result;
  } else {
    return executeCommandInner(command.inner, context);
  }
}

type ResolvedRedirectPipe = ResolvedRedirectPipeInput | ResolvedRedirectPipeOutput;
interface ResolvedRedirectPipeInput {
  kind: "input";
  pipe: Reader;
}
interface ResolvedRedirectPipeOutput {
  kind: "output";
  pipe: PipeWriter;
  toFd: 1 | 2;
}

async function resolveRedirectPipe(
  redirect: Redirect,
  context: Context,
): Promise<ResolvedRedirectPipe | ExecuteResult> {
  function handleFileOpenError(outputPath: string, err: any) {
    return context.error(`failed opening file for redirect (${outputPath}). ${err?.message ?? err}`);
  }

  const toFd = resolveRedirectToFd(redirect, context);
  if (typeof toFd !== "number") {
    return toFd;
  }
  const { ioFile } = redirect;
  if (ioFile.kind === "fd") {
    switch (redirect.op.kind) {
      case "input": {
        if (ioFile.value === 0) {
          return {
            kind: "input",
            pipe: getStdinReader(context.stdin),
          };
        } else if (ioFile.value === 1 || ioFile.value === 2) {
          return context.error(`redirecting stdout or stderr to a command input is not supported`);
        } else {
          const pipe = context.getFdReader(ioFile.value);
          if (pipe == null) {
            return context.error(`could not find fd reader: ${ioFile.value}`);
          } else {
            return {
              kind: "input",
              pipe,
            };
          }
        }
      }
      case "output": {
        if (ioFile.value === 0) {
          return context.error(`redirecting output to stdin is not supported`);
        } else if (ioFile.value === 1) {
          return {
            kind: "output",
            pipe: context.stdout.inner,
            toFd,
          };
        } else if (ioFile.value === 2) {
          return {
            kind: "output",
            pipe: context.stderr.inner,
            toFd,
          };
        } else {
          const pipe = context.getFdWriter(ioFile.value);
          if (pipe == null) {
            return context.error(`could not find fd: ${ioFile.value}`);
          } else {
            return {
              kind: "output",
              pipe,
              toFd,
            };
          }
        }
      }
      default: {
        const _assertNever: never = redirect.op;
        throw new Error("not implemented redirect op.");
      }
    }
  } else if (ioFile.kind === "word") {
    const words = await evaluateWordParts(ioFile.value, context);
    // edge case that's not supported
    if (words.length === 0) {
      return context.error("redirect path must be 1 argument, but found 0");
    } else if (words.length > 1) {
      return context.error(
        `redirect path must be 1 argument, but found ${words.length} (${words.join(" ")}). ` +
          `Did you mean to quote it (ex. "${words.join(" ")}")?`,
      );
    }

    switch (redirect.op.kind) {
      case "input": {
        const outputPath = path.isAbsolute(words[0]) ? words[0] : path.join(context.getCwd(), words[0]);
        try {
          const file = await Deno.open(outputPath, {
            read: true,
          });
          return {
            kind: "input",
            pipe: file,
          };
        } catch (err) {
          return handleFileOpenError(outputPath, err);
        }
      }
      case "output": {
        if (words[0] === "/dev/null") {
          return {
            kind: "output",
            pipe: new NullPipeWriter(),
            toFd: toFd,
          };
        }
        const outputPath = path.isAbsolute(words[0]) ? words[0] : path.join(context.getCwd(), words[0]);
        try {
          const file = await Deno.open(outputPath, {
            write: true,
            create: true,
            append: redirect.op.value === "append",
            truncate: redirect.op.value !== "append",
          });
          return {
            kind: "output",
            pipe: file,
            toFd: toFd,
          };
        } catch (err) {
          return handleFileOpenError(outputPath, err);
        }
      }
      default: {
        const _assertNever: never = redirect.op;
        throw new Error("not implemented redirect op.");
      }
    }
  } else {
    const _assertNever: never = ioFile;
    throw new Error("not implemented redirect io file.");
  }
}

function getStdinReader(stdin: CommandPipeReader): Reader {
  if (stdin === "inherit") {
    return Deno.stdin;
  } else if (stdin === "null") {
    return new NullPipeReader();
  } else {
    return stdin;
  }
}

function resolveRedirectToFd(redirect: Redirect, context: Context): ExecuteResult | Promise<ExecuteResult> | 1 | 2 {
  const maybeFd = redirect.maybeFd;
  if (maybeFd == null) {
    return 1; // stdout
  }
  if (maybeFd.kind === "stdoutStderr") {
    return context.error("redirecting to both stdout and stderr is not implemented");
  }
  if (maybeFd.fd !== 1 && maybeFd.fd !== 2) {
    return context.error(`only redirecting to stdout (1) and stderr (2) is supported`);
  } else {
    return maybeFd.fd;
  }
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
    context.setEnvVar(envVar.name, await evaluateWord(envVar.value, context));
  }
  const commandArgs = await evaluateArgs(command.args, context);
  return await executeCommandArgs(commandArgs, context);
}

async function executeCommandArgs(commandArgs: string[], context: Context): Promise<ExecuteResult> {
  // look for a registered command first
  const command = context.getCommand(commandArgs[0]);
  if (command != null) {
    return command(context.asCommandContext(commandArgs.slice(1)));
  }

  // fall back to trying to resolve the command on the fs
  const resolvedCommand = await resolveCommand(commandArgs[0], context);
  if (resolvedCommand.kind === "shebang") {
    return executeCommandArgs([...resolvedCommand.args, resolvedCommand.path, ...commandArgs.slice(1)], context);
  }
  const _assertIsPath: "path" = resolvedCommand.kind;
  const pipeStringVals = {
    stdin: getStdioStringValue(context.stdin),
    stdout: getStdioStringValue(context.stdout.kind),
    stderr: getStdioStringValue(context.stderr.kind),
  };
  let p: Deno.ChildProcess;
  const cwd = context.getCwd();
  try {
    p = new Deno.Command(resolvedCommand.path, {
      args: commandArgs.slice(1),
      cwd,
      env: context.getEnvVars(),
      clearEnv: true,
      ...pipeStringVals,
    }).spawn();
  } catch (err) {
    if (err.code === "ENOENT" && !fs.existsSync(cwd)) {
      throw new Error(`Failed to launch command because the cwd does not exist (${cwd}).`, {
        cause: err,
      });
    } else {
      throw err;
    }
  }
  const listener = (signal: Deno.Signal) => p.kill(signal);
  context.signal.addListener(listener);
  const completeController = new AbortController();
  const completeSignal = completeController.signal;
  let stdinError: unknown | undefined;
  const stdinPromise = writeStdin(context.stdin, p, completeSignal)
    .catch(async (err) => {
      // don't surface anything because it's already been aborted
      if (completeSignal.aborted) {
        return;
      }

      const maybePromise = context.stderr.writeLine(`stdin pipe broken. ${err?.message ?? err}`);
      if (maybePromise != null) {
        await maybePromise;
      }
      stdinError = err;
      // kill the sub process
      try {
        p.kill("SIGKILL");
      } catch (err) {
        if (!(err instanceof Deno.errors.PermissionDenied || err instanceof Deno.errors.NotFound)) {
          throw err;
        }
      }
    });
  try {
    const readStdoutTask = pipeStringVals.stdout === "piped"
      ? readStdOutOrErr(p.stdout, context.stdout)
      : Promise.resolve();
    const readStderrTask = pipeStringVals.stderr === "piped"
      ? readStdOutOrErr(p.stderr, context.stderr)
      : Promise.resolve();
    const [status] = await Promise.all([
      p.status,
      readStdoutTask,
      readStderrTask,
    ]);
    if (stdinError != null) {
      return {
        code: 1,
        kind: "exit",
      };
    } else {
      return { code: status.code };
    }
  } finally {
    completeController.abort();
    context.signal.removeListener(listener);

    // ensure this is done before exiting... it will never throw
    await stdinPromise;
  }

  async function writeStdin(stdin: CommandPipeReader, p: Deno.ChildProcess, signal: AbortSignal) {
    if (typeof stdin === "string") {
      return;
    }
    await pipeReaderToWritable(stdin, p.stdin, signal);
    try {
      await p.stdin.close();
    } catch {
      // ignore
    }
  }

  async function readStdOutOrErr(readable: ReadableStream<Uint8Array>, writer: ShellPipeWriter) {
    if (typeof writer === "string") {
      return;
    }
    // don't abort... ensure all of stdout/stderr is read in case the process
    // exits before this finishes
    await pipeReadableToWriterSync(readable, writer, new AbortController().signal);
  }

  function getStdioStringValue(value: ShellPipeReaderKind | ShellPipeWriterKind) {
    if (value === "inheritPiped") {
      return "piped";
    } else if (value === "inherit" || value === "null" || value === "piped") {
      return value;
    } else {
      return "piped";
    }
  }
}

async function pipeReaderToWritable(reader: Reader, writable: WritableStream<Uint8Array>, signal: AbortSignal) {
  const abortedPromise = new Promise<void>((resolve) => {
    signal.addEventListener("abort", listener);
    function listener() {
      signal.removeEventListener("abort", listener);
      resolve();
    }
  });
  const writer = writable.getWriter();
  try {
    while (!signal.aborted) {
      const buffer = new Uint8Array(1024);
      const length = await Promise.race([abortedPromise, reader.read(buffer)]);
      if (length === 0 || length == null) {
        break;
      }
      await writer.write(buffer.subarray(0, length));
    }
  } finally {
    await writer.close();
  }
}

async function pipeReadableToWriterSync(
  readable: ReadableStream<Uint8Array>,
  writer: ShellPipeWriter,
  signal: AbortSignal | KillSignal,
) {
  const reader = readable.getReader();
  while (!signal.aborted) {
    const result = await reader.read();
    if (result.done) {
      break;
    }
    const maybePromise = writer.writeAll(result.value);
    if (maybePromise) {
      await maybePromise;
    }
  }
}

async function pipeReaderToWriterSync(
  reader: Reader,
  writer: ShellPipeWriter,
  signal: AbortSignal | KillSignal,
) {
  const buffer = new Uint8Array(1024);
  while (!signal.aborted) {
    const bytesRead = await reader.read(buffer);
    if (bytesRead == null || bytesRead === 0) {
      break;
    }
    const maybePromise = writer.writeAll(buffer.slice(0, bytesRead));
    if (maybePromise) {
      await maybePromise;
    }
  }
}

function pipeCommandPipeReaderToWriterSync(
  reader: CommandPipeReader,
  writer: ShellPipeWriter,
  signal: KillSignal,
) {
  switch (reader) {
    case "inherit":
      return pipeReadableToWriterSync(Deno.stdin.readable, writer, signal);
    case "null":
      return Promise.resolve();
    default: {
      return pipeReaderToWriterSync(reader, writer, signal);
    }
  }
}

type ResolvedCommand = ResolvedPathCommand | ResolvedShebangCommand;

interface ResolvedPathCommand {
  kind: "path";
  path: string;
}

interface ResolvedShebangCommand {
  kind: "shebang";
  path: string;
  args: string[];
}

async function resolveCommand(commandName: string, context: Context): Promise<ResolvedCommand> {
  if (commandName.includes("/") || commandName.includes("\\")) {
    if (!path.isAbsolute(commandName)) {
      commandName = path.resolve(context.getCwd(), commandName);
    }
    // only bother checking for a shebang when the path has a slash
    // in it because for global commands someone on Windows likely
    // won't have a script with a shebang in it on Windows
    const result = await getExecutableShebangFromPath(commandName);
    if (result === false) {
      throw new Error(`Command not found: ${commandName}`);
    } else if (result != null) {
      return {
        kind: "shebang",
        path: commandName,
        args: await parseShebangArgs(result, context),
      };
    } else {
      const _assertUndefined: undefined = result;
      return {
        kind: "path",
        path: commandName,
      };
    }
  }

  // always use the current executable for "deno"
  if (commandName.toUpperCase() === "DENO") {
    return {
      kind: "path",
      path: Deno.execPath(),
    };
  }

  const realEnvironment = new DenoWhichRealEnvironment();
  const commandPath = await which(commandName, {
    os: Deno.build.os,
    stat: realEnvironment.stat,
    env(key) {
      return context.getVar(key);
    },
  });
  if (commandPath == null) {
    throw new Error(`Command not found: ${commandName}`);
  }
  return {
    kind: "path",
    path: commandPath,
  };
}

async function executePipeSequence(sequence: PipeSequence, context: Context): Promise<ExecuteResult> {
  const waitTasks: Promise<ExecuteResult>[] = [];
  let lastOutput = context.stdin;
  let nextInner: PipelineInner | undefined = sequence;
  while (nextInner != null) {
    let innerCommand: Command;
    switch (nextInner.kind) {
      case "pipeSequence":
        switch (nextInner.op) {
          case "stdout": {
            innerCommand = nextInner.current;
            break;
          }
          case "stdoutstderr": {
            return context.error(`piping to both stdout and stderr is not implemented (ex. |&)`);
          }
          default: {
            const _assertNever: never = nextInner.op;
            return context.error(`not implemented pipe sequence op: ${nextInner.op}`);
          }
        }
        nextInner = nextInner.next;
        break;
      case "command":
        innerCommand = nextInner;
        nextInner = undefined;
        break;
    }

    const buffer = new PipeSequencePipe();
    const newContext = context.withInner({
      stdout: new ShellPipeWriter("piped", buffer),
      stdin: lastOutput,
    });
    const commandPromise = executeCommand(innerCommand, newContext);
    waitTasks.push(commandPromise);
    commandPromise.finally(() => {
      buffer.close();
    });
    lastOutput = buffer;
  }
  waitTasks.push(
    pipeCommandPipeReaderToWriterSync(lastOutput, context.stdout, context.signal)
      .then(() => ({ code: 0 })),
  );
  const results = await Promise.all(waitTasks);
  // the second last result is the last command
  const secondLastResult = results[results.length - 2];
  return secondLastResult;
}

async function parseShebangArgs(info: ShebangInfo, context: Context): Promise<string[]> {
  function throwUnsupported(): never {
    throw new Error("Unsupported shebang. Please report this as a bug.");
  }

  if (!info.stringSplit) {
    return [info.command];
  }

  // todo: move shebang parsing into deno_task_shell and investigate actual shebang parsing behaviour
  const command = parseCommand(info.command);
  if (command.items.length !== 1) {
    throwUnsupported();
  }
  const item = command.items[0];
  if (item.sequence.kind !== "pipeline" || item.isAsync) {
    throwUnsupported();
  }
  const sequence = item.sequence;
  if (sequence.negated) {
    throwUnsupported();
  }
  if (sequence.inner.kind !== "command" || sequence.inner.redirect != null) {
    throwUnsupported();
  }
  const innerCommand = sequence.inner.inner;
  if (innerCommand.kind !== "simple") {
    throwUnsupported();
  }
  if (innerCommand.envVars.length > 0) {
    throwUnsupported();
  }
  return await evaluateArgs(innerCommand.args, context);
}

async function evaluateArgs(args: Word[], context: Context) {
  const result = [];
  for (const arg of args) {
    result.push(...await evaluateWordParts(arg, context));
  }
  return result;
}

async function evaluateWord(word: Word, context: Context) {
  const result = await evaluateWordParts(word, context);
  return result.join(" ");
}

async function evaluateWordParts(wordParts: WordPart[], context: Context, quoted = false) {
  // not implemented mostly, and copying from deno_task_shell
  const result: string[] = [];
  let currentText = "";
  let hasQuoted = false;
  for (const stringPart of wordParts) {
    let evaluationResult: string | undefined = undefined;
    switch (stringPart.kind) {
      case "text":
        currentText += stringPart.value;
        break;
      case "variable":
        evaluationResult = context.getVar(stringPart.value); // value is name
        break;
      case "quoted": {
        const text = (await evaluateWordParts(stringPart.value, context, true)).join("");
        currentText += text;
        hasQuoted = true;
        continue;
      }
      case "command":
      default:
        throw new Error(`Not implemented: ${stringPart.kind}`);
    }

    if (evaluationResult != null) {
      if (quoted) {
        currentText += evaluationResult;
      } else {
        const parts = evaluationResult.split(" ")
          .map((t) => t.trim())
          .filter((t) => t.length > 0);
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
  }
  if (hasQuoted || currentText.length !== 0) {
    result.push(currentText);
  }
  return result;
}

function isDisposable(value: unknown): value is Disposable {
  return value != null && typeof (value as any)[Symbol.dispose] === "function";
}

function isAsyncDisposable(value: unknown): value is AsyncDisposable {
  return value != null && typeof (value as any)[Symbol.asyncDispose] === "function";
}
