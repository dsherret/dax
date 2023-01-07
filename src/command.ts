import { CommandHandler } from "./command_handler.ts";
import { cdCommand } from "./commands/cd.ts";
import { echoCommand } from "./commands/echo.ts";
import { exitCommand } from "./commands/exit.ts";
import { exportCommand } from "./commands/export.ts";
import { mkdirCommand } from "./commands/mkdir.ts";
import { rmCommand } from "./commands/rm.ts";
import { pwdCommand } from "./commands/pwd.ts";
import { sleepCommand } from "./commands/sleep.ts";
import { testCommand } from "./commands/test.ts";
import { delayToMs, LoggerTreeBox } from "./common.ts";
import { Delay } from "./common.ts";
import { Buffer, colors, path } from "./deps.ts";
import {
  CapturingBufferWriter,
  InheritStaticTextBypassWriter,
  NullPipeWriter,
  ShellPipeReader,
  ShellPipeWriter,
  ShellPipeWriterKind,
} from "./pipes.ts";
import { parseCommand, spawn } from "./shell.ts";
import { cpCommand, mvCommand } from "./commands/cp_mv.ts";
import { isShowingProgressBars } from "./console/progress/interval.ts";

type BufferStdio = "inherit" | "null" | Buffer;

interface CommandBuilderState {
  command: string | undefined;
  stdin: ShellPipeReader;
  stdoutKind: ShellPipeWriterKind;
  stderrKind: ShellPipeWriterKind;
  noThrow: boolean;
  env: Record<string, string | undefined>;
  commands: Record<string, CommandHandler>;
  cwd: string | undefined;
  exportEnv: boolean;
  printCommand: boolean;
  printCommandLogger: LoggerTreeBox;
  timeout: number | undefined;
}

const textDecoder = new TextDecoder();

const builtInCommands = {
  cd: cdCommand,
  echo: echoCommand,
  exit: exitCommand,
  export: exportCommand,
  sleep: sleepCommand,
  test: testCommand,
  rm: rmCommand,
  mkdir: mkdirCommand,
  cp: cpCommand,
  mv: mvCommand,
  pwd: pwdCommand,
};

/**
 * Underlying builder API for executing commands.
 *
 * This is what `$` uses to execute commands. Using this provides
 * a way to provide a raw text command or an array of arguments.
 *
 * Command builders are immutable where each method call creates
 * a new command builder.
 *
 * ```ts
 * const builder = new CommandBuilder()
 *  .cwd("./src")
 *  .command("echo $MY_VAR");
 *
 * // outputs 5
 * console.log(await builder.env("MY_VAR", "5").text());
 * // outputs 6
 * console.log(await builder.env("MY_VAR", "6").text());
 * ```
 */
export class CommandBuilder implements PromiseLike<CommandResult> {
  #state: Readonly<CommandBuilderState> = {
    command: undefined,
    stdin: "inherit",
    stdoutKind: "inherit",
    stderrKind: "inherit",
    noThrow: false,
    env: {},
    cwd: undefined,
    commands: { ...builtInCommands },
    exportEnv: false,
    printCommand: false,
    printCommandLogger: new LoggerTreeBox(console.error),
    timeout: undefined,
  };

  #getClonedState(): CommandBuilderState {
    const state = this.#state;
    return {
      // be explicit here in order to evaluate each property on a case by case basis
      command: state.command,
      stdin: state.stdin,
      stdoutKind: state.stdoutKind,
      stderrKind: state.stderrKind,
      noThrow: state.noThrow,
      env: { ...state.env },
      cwd: state.cwd,
      commands: { ...state.commands },
      exportEnv: state.exportEnv,
      printCommand: state.printCommand,
      printCommandLogger: state.printCommandLogger.createChild(),
      timeout: state.timeout,
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

  /**
   * Explicit way to spawn a command.
   *
   * This is an alias for awaiting the command builder or calling `.then(...)`
   */
  spawn(): Promise<CommandResult> {
    // store a snapshot of the current command
    // in case someone wants to spawn multiple
    // commands with different state
    return parseAndSpawnCommand(this.#getClonedState());
  }

  /**
   * Register a command.
   */
  registerCommand(command: string, handleFn: CommandHandler) {
    validateCommandName(command);
    return this.#newWithState((state) => {
      state.commands[command] = handleFn;
    });
  }

  /**
   * Register multilple commands.
   */
  registerCommands(commands: Record<string, CommandHandler>) {
    let command: CommandBuilder = this;
    for (const [key, value] of Object.entries(commands)) {
      command = command.registerCommand(key, value);
    }
    return command;
  }

  /**
   * Unregister a command.
   */
  unregisterCommand(command: string) {
    return this.#newWithState((state) => {
      delete state.commands[command];
    });
  }

  /** Sets the raw command to execute. */
  command(command: string | string[]) {
    return this.#newWithState((state) => {
      if (typeof command === "string") {
        state.command = command;
      } else {
        state.command = command.map(escapeArg).join(" ");
      }
    });
  }

  /** The command should not throw when it fails or times out. */
  noThrow(value = true) {
    return this.#newWithState((state) => {
      state.noThrow = value;
    });
  }

  /** Sets the stdin to use for the command. */
  stdin(reader: ShellPipeReader | string | Uint8Array) {
    return this.#newWithState((state) => {
      if (typeof reader === "string") {
        // todo: support cloning these buffers so that
        // the state is immutable when creating a new
        // builder... this is a bug
        state.stdin = new Buffer(new TextEncoder().encode(reader));
      } else if (reader instanceof Uint8Array) {
        state.stdin = new Buffer(reader);
      } else {
        state.stdin = reader;
      }
    });
  }

  /** Set the stdout kind. */
  stdout(kind: ShellPipeWriterKind) {
    return this.#newWithState((state) => {
      state.stdoutKind = kind;
    });
  }

  /** Set the stderr kind. */
  stderr(kind: ShellPipeWriterKind) {
    return this.#newWithState((state) => {
      state.stderrKind = kind;
    });
  }

  /** Sets multiple environment variables to use at the same time via an object literal. */
  env(items: Record<string, string | undefined>): CommandBuilder;
  /** Sets a single environment variable to use. */
  env(name: string, value: string | undefined): CommandBuilder;
  env(nameOrItems: string | Record<string, string | undefined>, value?: string) {
    return this.#newWithState((state) => {
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
      state.env[key] = value;
    }
  }

  /** Sets the current working directory to use when executing this command. */
  cwd(dirPath: string | URL) {
    return this.#newWithState((state) => {
      state.cwd = dirPath instanceof URL ? path.fromFileUrl(dirPath) : path.resolve(dirPath);
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
    return this.#newWithState((state) => {
      state.exportEnv = value;
    });
  }

  /**
   * Prints the command text before executing the command.
   *
   * For example:
   *
   * ```ts
   * const text = "example";
   * await $`echo ${text}`.printCommand();
   * ```
   *
   * Outputs:
   *
   * ```
   * > echo example
   * example
   * ```
   */
  printCommand(value = true) {
    return this.#newWithState((state) => {
      state.printCommand = value;
    });
  }

  /**
   * Mutates the command builder to change the logger used
   * for `printCommand()`.
   */
  setPrintCommandLogger(logger: (...args: any[]) => void) {
    this.#state.printCommandLogger.setValue(logger);
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
    return this.#newWithState((state) => {
      if (kind === "both" || kind === "stdout") {
        state.stdoutKind = getQuietKind(state.stdoutKind);
      }
      if (kind === "both" || kind === "stderr") {
        state.stderrKind = getQuietKind(state.stderrKind);
      }
    });

    function getQuietKind(kind: ShellPipeWriterKind): ShellPipeWriterKind {
      switch (kind) {
        case "inheritPiped":
        case "inherit":
          return "piped";
        case "null":
        case "piped":
          return kind;
        default: {
          const _assertNever: never = kind;
          throw new Error(`Unhandled kind ${kind}.`);
        }
      }
    }
  }

  /**
   * Specifies a timeout for the command. The command will exit with
   * exit code `124` (timeout) if it times out.
   *
   * Note that when using `.noThrow()` this won't cause an error to
   * be thrown when timing out.
   */
  timeout(delay: Delay) {
    return this.#newWithState((state) => {
      state.timeout = delayToMs(delay);
    });
  }

  /**
   * Sets stdout as quiet, spawns the command, and gets stdout as a Uint8Array.
   *
   * Shorthand for:
   *
   * ```ts
   * const data = (await $`command`.quiet("stdout")).stdoutBytes;
   * ```
   */
  async bytes() {
    return (await this.quiet("stdout")).stdoutBytes;
  }

  /**
   * Sets stdout as quiet, spawns the command, and gets stdout as a string without the last newline.
   *
   * Shorthand for:
   *
   * ```ts
   * const data = (await $`command`.quiet("stdout")).stdout.replace(/\r?\n$/, "");
   * ```
   */
  async text() {
    return (await this.quiet("stdout")).stdout.replace(/\r?\n$/, "");
  }

  /** Gets the text as an array of lines. */
  async lines() {
    const text = await this.text();
    return text.split(/\r?\n/g);
  }

  /**
   * Sets stdout as quiet, spawns the command, and gets stdout as JSON.
   *
   * Shorthand for:
   *
   * ```ts
   * const data = (await $`command`.quiet("stdout")).stdoutJson;
   * ```
   */
  async json<TResult = any>(): Promise<TResult> {
    return (await this.quiet("stdout")).stdoutJson;
  }

  /**
   * @internal
   * Gets the registered command names.
   */
  getRegisteredCommandNames() {
    return Object.keys(this.#state.commands);
  }
}

export async function parseAndSpawnCommand(state: CommandBuilderState) {
  if (state.command == null) {
    throw new Error("A command must be set before it can be spawned.");
  }

  if (state.printCommand) {
    state.printCommandLogger.getValue()(colors.white(">"), colors.blue(state.command));
  }

  const [stdoutBuffer, stderrBuffer, combinedBuffer] = getBuffers();
  const stdout = new ShellPipeWriter(
    state.stdoutKind,
    stdoutBuffer === "null" ? new NullPipeWriter() : stdoutBuffer === "inherit" ? Deno.stdout : stdoutBuffer,
  );
  const stderr = new ShellPipeWriter(
    state.stderrKind,
    stderrBuffer === "null" ? new NullPipeWriter() : stderrBuffer === "inherit" ? Deno.stderr : stderrBuffer,
  );

  const abortController = new AbortController();
  let timeoutId: number | undefined;
  if (state.timeout != null) {
    timeoutId = setTimeout(() => abortController.abort(), state.timeout);
  }

  try {
    const list = parseCommand(state.command);
    const code = await spawn(list, {
      stdin: state.stdin,
      stdout,
      stderr,
      env: buildEnv(state.env),
      commands: state.commands,
      cwd: state.cwd ?? Deno.cwd(),
      exportEnv: state.exportEnv,
      signal: abortController.signal,
    });
    if (code !== 0 && !state.noThrow) {
      if (abortController.signal.aborted) {
        throw new Error(`Timed out with exit code: ${code}`);
      } else {
        throw new Error(`Exited with code: ${code}`);
      }
    }
    return new CommandResult(
      code,
      finalizeCommandResultBuffer(stdoutBuffer),
      finalizeCommandResultBuffer(stderrBuffer),
      combinedBuffer instanceof Buffer ? combinedBuffer : undefined,
    );
  } finally {
    if (timeoutId != null) {
      clearTimeout(timeoutId);
    }
  }

  function getBuffers() {
    const hasProgressBars = isShowingProgressBars();
    const stdoutBuffer = getOutputBuffer(Deno.stdout, state.stdoutKind);
    const stderrBuffer = getOutputBuffer(Deno.stderr, state.stderrKind);
    if (isPipedBuffer(stdoutBuffer) && isPipedBuffer(stderrBuffer)) {
      // if both are piped then create a capturing buffer writer for both
      const combinedBuffer = new Buffer();
      return [
        new CapturingBufferWriter(stdoutBuffer, combinedBuffer),
        new CapturingBufferWriter(stderrBuffer, combinedBuffer),
        combinedBuffer,
      ] as const;
    }
    return [stdoutBuffer, stderrBuffer, undefined] as const;

    function getOutputBuffer(innerWriter: Deno.WriterSync, kind: ShellPipeWriterKind) {
      switch (kind) {
        case "inherit":
          if (hasProgressBars) {
            return new InheritStaticTextBypassWriter(innerWriter);
          } else {
            return "inherit";
          }
        case "piped":
          return new Buffer();
        case "inheritPiped":
          return new CapturingBufferWriter(innerWriter, new Buffer());
        case "null":
          return "null";
        default: {
          const _assertNever: never = kind;
          throw new Error("Unhandled.");
        }
      }
    }

    function isPipedBuffer(
      pipe: Buffer | CapturingBufferWriter | InheritStaticTextBypassWriter | "null" | "inherit",
    ): pipe is Buffer | CapturingBufferWriter {
      return pipe instanceof Buffer || pipe instanceof CapturingBufferWriter;
    }
  }

  function finalizeCommandResultBuffer(
    buffer: Buffer | "inherit" | "null" | CapturingBufferWriter | InheritStaticTextBypassWriter,
  ) {
    if (buffer instanceof CapturingBufferWriter) {
      return buffer.getBuffer();
    } else if (buffer instanceof InheritStaticTextBypassWriter) {
      buffer.flush(); // this is line buffered, so flush anything left
      return "inherit";
    } else {
      return buffer;
    }
  }
}

/** Result of running a command. */
export class CommandResult {
  #stdout: BufferStdio;
  #stderr: BufferStdio;
  #combined: Buffer | undefined;

  /** The exit code. */
  readonly code: number;

  constructor(code: number, stdout: BufferStdio, stderr: BufferStdio, combined: Buffer | undefined) {
    this.code = code;
    this.#stdout = stdout;
    this.#stderr = stderr;
    this.#combined = combined;
  }

  #memoizedStdout: string | undefined;

  /** Raw decoded stdout text. */
  get stdout() {
    if (!this.#memoizedStdout) {
      this.#memoizedStdout = textDecoder.decode(this.stdoutBytes);
    }
    return this.#memoizedStdout;
  }

  #memoizedStdoutJson: any | undefined;

  /**
   * Stdout text as JSON.
   *
   * @remarks Will throw if it can't be parsed as JSON.
   */
  get stdoutJson() {
    if (this.#memoizedStdoutJson == null) {
      this.#memoizedStdoutJson = JSON.parse(this.stdout);
    }
    return this.#memoizedStdoutJson;
  }

  /** Raw stdout bytes. */
  get stdoutBytes(): Uint8Array {
    if (typeof this.#stdout === "string") {
      throw new Error(
        `Stdout was not piped (was ${this.#stdout}). Call .stdout("piped") or .stdout("capture") on the process.`,
      );
    }
    return this.#stdout.bytes();
  }

  #memoizedStderr: string | undefined;

  /** Raw decoded stdout text. */
  get stderr() {
    if (!this.#memoizedStderr) {
      this.#memoizedStderr = textDecoder.decode(this.stderrBytes);
    }
    return this.#memoizedStderr;
  }

  #memoizedStderrJson: any | undefined;

  /**
   * Stderr text as JSON.
   *
   * @remarks Will throw if it can't be parsed as JSON.
   */
  get stderrJson() {
    if (this.#memoizedStderrJson == null) {
      this.#memoizedStderrJson = JSON.parse(this.stderr);
    }
    return this.#memoizedStderrJson;
  }

  /** Raw stderr bytes. */
  get stderrBytes(): Uint8Array {
    if (typeof this.#stderr === "string") {
      throw new Error(
        `Stderr was not piped (was ${this.#stderr}). Call .stderr("piped") or .stderr("capture") on the process.`,
      );
    }
    return this.#stderr.bytes();
  }

  #memoizedCombined: string | undefined;

  /** Raw combined stdout and stderr text. */
  get combined() {
    if (!this.#memoizedCombined) {
      this.#memoizedCombined = textDecoder.decode(this.combinedBytes);
    }
    return this.#memoizedCombined;
  }

  /** Raw combined stdout and stderr bytes. */
  get combinedBytes(): Uint8Array {
    if (this.#combined == null) {
      // one of these won't be piped, and accessing
      // them will throw the appropriate exception
      this.stdoutBytes;
      this.stderrBytes;
      throw new Error("unreachable");
    }
    return this.#combined.bytes();
  }
}

function buildEnv(env: Record<string, string | undefined>) {
  const result = Deno.env.toObject();
  for (const [key, value] of Object.entries(env)) {
    if (value == null) {
      delete result[key];
    } else {
      result[key] = value;
    }
  }
  return result;
}

export function escapeArg(arg: string) {
  // very basic for now
  if (/^[A-Za-z0-9]*$/.test(arg)) {
    return arg;
  } else {
    return `'${arg.replace("'", `'"'"'`)}'`;
  }
}

function validateCommandName(command: string) {
  if (command.match(/^[a-zA-Z0-9-_]+$/) == null) {
    throw new Error("Invalid command name");
  }
}
