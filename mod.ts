import { Buffer, colors, fs, path, which, whichSync } from "./src/deps.ts";
import {
  CapturingBufferWriter,
  NullPipeWriter,
  ShellPipeReader,
  ShellPipeWriter,
  ShellPipeWriterKind,
} from "./src/pipes.ts";
import { parseArgs, spawn } from "./src/shell.ts";

/**
 * Cross platform shell tools for Deno inspired by [zx](https://github.com/google/zx).
 *
 * Differences:
 *
 * 1. No globals or global configuration.
 * 1. No custom CLI.
 * 1. Cross platform shell to help the code work on Windows.
 *    - Uses [deno_task_shell](https://github.com/denoland/deno_task_shell)'s parser.
 *    - Allows exporting the shell's environment to the current process.
 * 1. Good for application code in addition to use as a shell script replacement
 * 1. Named after my cat.
 *
 * ## Example
 *
 * ```ts
 * import $ from "https://deno.land/x/dax@VERSION_GOES_HERE/mod.ts";
 *
 * await $`echo hello`;
 * ```
 *
 * @module
 */

const textDecoder = new TextDecoder();

export interface $Type {
  (strings: TemplateStringsArray, ...exprs: any[]): CommandBuilder;
  cd(path: string | URL): void;
  fs: typeof fs;
  log(...data: any[]): void;
  logError(boldText: string, ...data: any[]): void;
  logTitle(title: string, ...data: any[]): void;
  logIndent<TResult>(action: () => TResult): TResult;
  path: typeof path;
  sleep(ms: number): Promise<void>;
  withRetries<TReturn>(params: RetryParams<TReturn>): Promise<TReturn>;
  which: typeof which;
  whichSync: typeof whichSync;
}

type BufferStdio = "inherit" | "null" | Buffer;

interface CommandBuilderState {
  command: string | undefined;
  stdin: ShellPipeReader;
  stdoutKind: ShellPipeWriterKind;
  stderrKind: ShellPipeWriterKind;
  noThrow: boolean;
  env: Record<string, string>;
  cwd: string;
  exportEnv: boolean;
}

export class CommandBuilder implements PromiseLike<CommandResult> {
  #state: CommandBuilderState | undefined;

  #getState() {
    if (this.#state == null) {
      this.#state = {
        command: undefined,
        stdin: "inherit",
        stdoutKind: "default",
        stderrKind: "default",
        noThrow: false,
        env: Deno.env.toObject(),
        cwd: Deno.cwd(),
        exportEnv: false,
      };
    }
    return this.#state;
  }

  clone() {
    const builder = new CommandBuilder();
    if (this.#state != null) {
      // be explicit here in order to evaluate each property on a case by case basis
      builder.#state = {
        command: this.#state.command,
        stdin: this.#state.stdin,
        stdoutKind: this.#state.stdoutKind,
        stderrKind: this.#state.stderrKind,
        noThrow: this.#state.noThrow,
        env: { ...this.#state.env },
        cwd: this.#state.cwd,
        exportEnv: this.#state.exportEnv,
      };
    }
    return builder;
  }

  then<TResult1 = CommandResult, TResult2 = never>(
    onfulfilled?: ((value: CommandResult) => TResult1 | PromiseLike<TResult1>) | null | undefined,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null | undefined,
  ): PromiseLike<TResult1 | TResult2> {
    return this.spawn().then(onfulfilled).catch(onrejected);
  }

  build$(): $Type {
    return create$(this.clone());
  }

  spawn(): Promise<CommandResult> {
    const currentState = this.#getState();
    // store a snapshot of the current command
    // in case someone wants to spawn multiple
    // commands with different state
    return parseAndSpawnCommand({
      command: currentState.command,
      stdin: currentState.stdin,
      stdoutKind: currentState.stdoutKind,
      stderrKind: currentState.stderrKind,
      noThrow: currentState.noThrow,
      env: { ...currentState.env },
      cwd: currentState.cwd,
      exportEnv: currentState.exportEnv,
    });
  }

  /** Sets the raw command to execute. */
  command(commandText: string) {
    this.#getState().command = commandText;
    return this;
  }

  noThrow(): this {
    this.#getState().noThrow = true;
    return this;
  }

  stdout(kind: ShellPipeWriterKind) {
    this.#getState().stdoutKind = kind;
    return this;
  }

  stderr(kind: ShellPipeWriterKind) {
    this.#getState().stderrKind = kind;
    return this;
  }

  env(items: Record<string, string | undefined>): this;
  env(name: string, value: string | undefined): this;
  env(nameOrItems: string | Record<string, string | undefined>, value?: string) {
    if (typeof nameOrItems === "string") {
      this.#setEnv(nameOrItems, value);
    } else {
      for (const [key, value] of Object.entries(nameOrItems)) {
        this.#setEnv(key, value);
      }
    }
    return this;
  }

  #setEnv(key: string, value: string | undefined) {
    if (Deno.build.os === "windows") {
      key = key.toUpperCase();
    }
    if (value == null) {
      delete this.#getState().env[key];
    } else {
      this.#getState().env[key] = value;
    }
  }

  cwd(dirPath: string) {
    this.#getState().cwd = path.resolve(dirPath);
  }

  /**
   * Exports the environment of the command to the executing process.
   *
   * So for example, changing the directory in a command or exporting
   * an environment variable will actually change the environment
   * of the executing process.
   *
   * ```ts
   * await $`cd src && export SOME_VALUE=5`;
   * console.log(Deno.env.get("SOME_VALUE")); // 5
   * console.log(Deno.cwd()); // will be in the src directory
   * ```
   */
  exportEnv(value = true) {
    this.#getState().exportEnv = value;
    return this;
  }

  /** Ensures stdout and stderr are piped if they have the default behaviour or are inherited. */
  quiet() {
    const state = this.#getState();
    state.stdoutKind = getQuietKind(state.stdoutKind);
    state.stderrKind = getQuietKind(state.stderrKind);
    return this;

    function getQuietKind(kind: ShellPipeWriterKind): ShellPipeWriterKind {
      switch (kind) {
        case "default":
        case "inherit":
          return "piped";
        case "null":
        case "piped":
          return kind;
        default:
          const _assertNever: never = kind;
          throw new Error(`Unhandled kind ${kind}.`);
      }
    }
  }
}

async function parseAndSpawnCommand(state: CommandBuilderState) {
  if (state.command == null) {
    throw new Error("A command must be set before it can be spawned.");
  }

  const stdoutBuffer = state.stdoutKind === "default"
    ? new CapturingBufferWriter(Deno.stderr, new Buffer())
    : state.stdoutKind === "null"
    ? "null"
    : state.stdoutKind === "inherit"
    ? "inherit"
    : new Buffer();
  const stdout = new ShellPipeWriter(
    state.stdoutKind,
    stdoutBuffer === "null"
      ? new NullPipeWriter()
      : stdoutBuffer === "inherit"
      ? Deno.stdout
      : stdoutBuffer,
  );
  const stderrBuffer = state.stderrKind === "default"
    ? new CapturingBufferWriter(Deno.stderr, new Buffer())
    : state.stderrKind === "null"
    ? "null"
    : state.stderrKind === "inherit"
    ? "inherit"
    : new Buffer();
  const stderr = new ShellPipeWriter(
    state.stderrKind,
    stderrBuffer === "null"
      ? new NullPipeWriter()
      : stderrBuffer === "inherit"
      ? Deno.stderr
      : stderrBuffer,
  );

  const list = await parseArgs(state.command);
  const code = await spawn(list, {
    stdin: state.stdin,
    stdout,
    stderr,
    env: state.env,
    cwd: state.cwd,
    exportEnv: state.exportEnv,
  });
  if (code !== 0 && !state.noThrow) {
    throw new Error(`Exited with error code: ${code}`);
  }
  return new CommandResult(
    code,
    stdoutBuffer instanceof CapturingBufferWriter ? stdoutBuffer.getBuffer() : stdoutBuffer,
    stderrBuffer instanceof CapturingBufferWriter ? stderrBuffer.getBuffer() : stderrBuffer,
  );
}

export class CommandResult {
  #stdout: BufferStdio;
  #stderr: BufferStdio;
  /** The exit code. */
  readonly code: number;

  constructor(code: number, stdout: BufferStdio, stderr: BufferStdio) {
    this.code = code;
    this.#stdout = stdout;
    this.#stderr = stderr;
  }

  #memoizedStdout: string | undefined;

  get stdout() {
    if (!this.#memoizedStdout) {
      this.#memoizedStdout = textDecoder.decode(this.stdoutBytes);
    }
    return this.#memoizedStdout;
  }

  #memoizedStdoutJson: any | undefined;

  get stdoutJson() {
    if (this.#memoizedStdoutJson == null) {
      this.#memoizedStdoutJson = JSON.parse(this.stdout);
    }
    return this.#memoizedStdoutJson;
  }

  get stdoutBytes(): Uint8Array {
    if (typeof this.#stdout === "string") {
      throw new Error(`Stdout was not piped (was ${this.#stdout}). By default stdout is piped.`);
    }
    return this.#stdout.bytes();
  }

  #memoizedStderr: string | undefined;

  get stderr() {
    if (!this.#memoizedStderr) {
      this.#memoizedStderr = textDecoder.decode(this.stderrBytes);
    }
    return this.#memoizedStderr;
  }

  #memoizedStderrJson: any | undefined;

  get stderrJson() {
    if (this.#memoizedStderrJson == null) {
      this.#memoizedStderrJson = JSON.parse(this.stderr);
    }
    return this.#memoizedStderrJson;
  }

  get stderrBytes(): Uint8Array {
    if (typeof this.#stderr === "string") {
      throw new Error(`Stderr was not piped (was ${this.#stderr}). Call .stderr("pipe") on the process.`);
    }
    return this.#stderr.bytes();
  }
}

function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms));
}

export interface RetryParams<TReturn> {
  count: number;
  /** Delay in milliseconds. */
  delay: number;
  action: () => Promise<TReturn>;
}

async function withRetries<TReturn>(params: RetryParams<TReturn>) {
  for (let i = 0; i < params.count; i++) {
    if (i > 0) {
      console.error(
        `Failed. Trying again in ${params.delay} seconds...`,
      );
      await sleep(params.delay);
      console.error(`Attempt ${i + 1}/${params.count}...`);
    }
    try {
      return await params.action();
    } catch (err) {
      console.error(err);
    }
  }

  throw new Error(`Failed after ${params.count} attempts.`);
}

function cd(path: string | URL) {
  Deno.chdir(path);
}

// this is global because it then allows functions to easily call
// other functions and those should be indented underneath
let indentLevel = 0;
function getIndentText() {
  return "  ".repeat(indentLevel);
}

const helperObject = {
  fs,
  path,
  cd,
  log(...data: any[]) {
    if (data.length === 0) {
      return;
    }
    const firstArg = `${getIndentText()}${data[0]}`;
    console.log(firstArg, ...data.slice(1));
  },
  logError(boldText: string, ...data: any[]) {
    console.error(getIndentText() + colors.bold(colors.red(boldText)), ...data);
  },
  logTitle(title: string, ...data: any[]) {
    console.log(getIndentText() + colors.bold(colors.green(title)), ...data);
  },
  logIndent<TResult>(action: () => TResult): TResult {
    indentLevel++;
    let wasPromise = false;
    try {
      const result = action();
      if (result instanceof Promise) {
        wasPromise = true;
        return result.finally(() => {
          indentLevel--;
        }) as any;
      } else {
        return result;
      }
    } finally {
      if (!wasPromise) {
        indentLevel--;
      }
    }
  },
  sleep,
  withRetries,
  which(commandName: string) {
    if (commandName.toUpperCase() === "DENO") {
      return Promise.resolve(Deno.execPath());
    } else {
      return which(commandName);
    }
  },
  whichSync(commandName: string) {
    if (commandName.toUpperCase() === "DENO") {
      return Deno.execPath();
    } else {
      return whichSync(commandName);
    }
  },
};

function create$(ownedStartingBuilder: CommandBuilder) {
  return Object.assign((strings: TemplateStringsArray, ...exprs: any[]) => {
    // don't bother escaping for now... work on that later
    let result = "";
    for (let i = 0; i < Math.max(strings.length, exprs.length); i++) {
      if (strings.length > i) {
        result += strings[i];
      }
      if (exprs.length > i) {
        const expr = exprs[i];
        if (expr instanceof CommandResult) {
          // remove last newline
          result += expr.stdout.replace(/\r?\n$/, "");
        } else {
          result += `${exprs[i]}`;
        }
      }
    }
    return ownedStartingBuilder.clone().command(result);
  }, helperObject);
}

export const $: $Type = create$(new CommandBuilder());
export default $;
