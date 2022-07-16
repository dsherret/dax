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
  #state: Readonly<CommandBuilderState> | undefined;

  #getClonedState(): CommandBuilderState {
    const state = this.#state;
    if (state == null) {
      return this.#getDefaultState();
    }
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

  #getDefaultState(): CommandBuilderState {
    return {
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

  #newWithState(action: (state: CommandBuilderState) => void): CommandBuilder {
    const builder = new CommandBuilder();
    const state = this.#getClonedState();
    action(state);
    builder.#state = state;
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
    return parseAndSpawnCommand(this.#getClonedState());
  }

  /** Sets the raw command to execute. */
  command(commandText: string) {
    return this.#newWithState(state => {
      state.command = commandText;
    });
  }

  noThrow(value = true) {
    return this.#newWithState(state => {
      state.noThrow = value;
    });
  }

  stdout(kind: ShellPipeWriterKind) {
    return this.#newWithState(state => {
      state.stdoutKind = kind;
    });
  }

  stderr(kind: ShellPipeWriterKind) {
    return this.#newWithState(state => {
      state.stderrKind = kind;
    });
  }

  env(items: Record<string, string | undefined>): this;
  env(name: string, value: string | undefined): this;
  env(nameOrItems: string | Record<string, string | undefined>, value?: string) {
    return this.#newWithState(state => {
      if (typeof nameOrItems === "string") {
        setEnv(state, nameOrItems, value);
      } else {
        for (const [key, value] of Object.entries(nameOrItems)) {
          setEnv(state, key, value);
        }
      }
    });

    function setEnv(state: CommandBuilderState, key: string, value: string | undefined) {
      if (Deno.build.os === "windows") {
        key = key.toUpperCase();
      }
      if (value == null) {
        delete state.env[key];
      } else {
        state.env[key] = value;
      }
    }
  }

  cwd(dirPath: string) {
    return this.#newWithState(state => {
      state.cwd = path.resolve(dirPath);
    });
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
    return this.#newWithState(state => {
      state.exportEnv = value;
    });
  }

  /**
   * Ensures stdout and stderr are piped if they have the default behaviour or are inherited.
   *
   * ```ts
   * // ensure both stdout and stderr is not logged to the console
   * await $`echo 1`.quiet();
   * // ensure stdout is not logged to the console
   * await $`echo 1`.quiet("stdout");
   * // ensure stderr is not logged to the console
   * await $`echo 1`.quiet("stderr");
   * ```
   */
  quiet(kind: "stdout" | "stderr" | "both" = "both") {
    return this.#newWithState(state => {
      if (kind === "both" || kind === "stdout") {
        state.stdoutKind = getQuietKind(state.stdoutKind);
      }
      if (kind === "both" || kind === "stderr") {
        state.stderrKind = getQuietKind(state.stderrKind);
      }
    });

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
