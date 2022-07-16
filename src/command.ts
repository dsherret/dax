import { Buffer, path } from "./deps.ts";
import {
  CapturingBufferWriter,
  NullPipeWriter,
  ShellPipeReader,
  ShellPipeWriter,
  ShellPipeWriterKind,
} from "./pipes.ts";
import { parseArgs, spawn } from "./shell.ts";

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

const textDecoder = new TextDecoder();

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

  #getStateCloned(): CommandBuilderState {
    const state = this.#getState();
    return {
      // be explicit here in order to evaluate each property on a case by case basis
      command: state.command,
      stdin: state.stdin,
      stdoutKind: state.stdoutKind,
      stderrKind: state.stderrKind,
      noThrow: state.noThrow,
      env: { ...state.env },
      cwd: state.cwd,
      exportEnv: state.exportEnv,
    };
  }

  /**
   * Clones the builder.
   *
   * Mutations to the clone will not affect the original object.
   */
  clone() {
    const builder = new CommandBuilder();
    if (this.#state != null) {
      builder.#state = this.#getStateCloned();
    }
    return builder;
  }

  then<TResult1 = CommandResult, TResult2 = never>(
    onfulfilled?: ((value: CommandResult) => TResult1 | PromiseLike<TResult1>) | null | undefined,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null | undefined,
  ): PromiseLike<TResult1 | TResult2> {
    return this.spawn().then(onfulfilled).catch(onrejected);
  }

  spawn(): Promise<CommandResult> {
    // store a snapshot of the current command
    // in case someone wants to spawn multiple
    // commands with different state
    return parseAndSpawnCommand(this.#getStateCloned());
  }

  /** Sets the raw command to execute. */
  command(commandText: string) {
    this.#getState().command = commandText;
    return this;
  }

  noThrow(value = true): this {
    this.#getState().noThrow = value;
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

export async function parseAndSpawnCommand(state: CommandBuilderState) {
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
