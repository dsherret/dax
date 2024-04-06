import type { CommandHandler } from "./command_handler.ts";
import { cdCommand } from "./commands/cd.ts";
import { printEnvCommand } from "./commands/printenv.ts";
import { cpCommand, mvCommand } from "./commands/cp_mv.ts";
import { echoCommand } from "./commands/echo.ts";
import { catCommand } from "./commands/cat.ts";
import { exitCommand } from "./commands/exit.ts";
import { exportCommand } from "./commands/export.ts";
import { mkdirCommand } from "./commands/mkdir.ts";
import { rmCommand } from "./commands/rm.ts";
import { pwdCommand } from "./commands/pwd.ts";
import { sleepCommand } from "./commands/sleep.ts";
import { testCommand } from "./commands/test.ts";
import { touchCommand } from "./commands/touch.ts";
import { unsetCommand } from "./commands/unset.ts";
import { Box, delayToMs, errorToString, LoggerTreeBox } from "./common.ts";
import type { Delay } from "./common.ts";
import { Buffer, colors, path, readerFromStreamReader, writerFromStreamWriter } from "./deps.ts";
import {
  CapturingBufferWriter,
  CapturingBufferWriterSync,
  InheritStaticTextBypassWriter,
  NullPipeWriter,
  PipedBuffer,
  type Reader,
  type ShellPipeReaderKind,
  ShellPipeWriter,
  type ShellPipeWriterKind,
  type Writer,
  type WriterSync,
} from "./pipes.ts";
import { parseCommand, spawn } from "./shell.ts";
import { isShowingProgressBars } from "./console/progress/interval.ts";
import { Path } from "./path.ts";
import { RequestBuilder } from "./request.ts";
import { StreamFds } from "./shell.ts";
import { symbols } from "./common.ts";
import { whichCommand } from "./commands/which.ts";

type BufferStdio = "inherit" | "null" | "streamed" | Buffer;
type StreamKind = "stdout" | "stderr" | "combined";

class Deferred<T> {
  #create: () => T | Promise<T>;
  constructor(create: () => T | Promise<T>) {
    this.#create = create;
  }

  create() {
    return this.#create();
  }
}

interface ShellPipeWriterKindWithOptions {
  kind: ShellPipeWriterKind;
  options?: PipeOptions;
}

interface CommandBuilderStateCommand {
  text: string;
  fds: StreamFds | undefined;
}

interface CommandBuilderState {
  command: Readonly<CommandBuilderStateCommand> | undefined;
  stdin:
    | "inherit"
    | "null"
    | Box<Reader | ReadableStream<Uint8Array> | "consumed">
    | Deferred<ReadableStream<Uint8Array> | Reader>;
  combinedStdoutStderr: boolean;
  stdout: ShellPipeWriterKindWithOptions;
  stderr: ShellPipeWriterKindWithOptions;
  noThrow: boolean | number[];
  env: Record<string, string | undefined>;
  commands: Record<string, CommandHandler>;
  cwd: string | undefined;
  exportEnv: boolean;
  printCommand: boolean;
  printCommandLogger: LoggerTreeBox;
  timeout: number | undefined;
  signal: KillSignal | undefined;
}

const textDecoder = new TextDecoder();

const builtInCommands = {
  cd: cdCommand,
  printenv: printEnvCommand,
  echo: echoCommand,
  cat: catCommand,
  exit: exitCommand,
  export: exportCommand,
  sleep: sleepCommand,
  test: testCommand,
  rm: rmCommand,
  mkdir: mkdirCommand,
  cp: cpCommand,
  mv: mvCommand,
  pwd: pwdCommand,
  touch: touchCommand,
  unset: unsetCommand,
  which: whichCommand,
};

/** @internal */
export const getRegisteredCommandNamesSymbol: unique symbol = Symbol();
/** @internal */
export const setCommandTextStateSymbol: unique symbol = Symbol();

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
    combinedStdoutStderr: false,
    stdin: "inherit",
    stdout: {
      kind: "inherit",
    },
    stderr: {
      kind: "inherit",
    },
    noThrow: false,
    env: {},
    cwd: undefined,
    commands: { ...builtInCommands },
    exportEnv: false,
    printCommand: false,
    printCommandLogger: new LoggerTreeBox(
      // deno-lint-ignore no-console
      (cmd) => console.error(colors.white(">"), colors.blue(cmd)),
    ),
    timeout: undefined,
    signal: undefined,
  };

  #getClonedState(): CommandBuilderState {
    const state = this.#state;
    return {
      // be explicit here in order to evaluate each property on a case by case basis
      command: state.command,
      combinedStdoutStderr: state.combinedStdoutStderr,
      stdin: state.stdin,
      stdout: {
        kind: state.stdout.kind,
        options: state.stdout.options,
      },
      stderr: {
        kind: state.stderr.kind,
        options: state.stderr.options,
      },
      noThrow: state.noThrow instanceof Array ? [...state.noThrow] : state.noThrow,
      env: { ...state.env },
      cwd: state.cwd,
      commands: { ...state.commands },
      exportEnv: state.exportEnv,
      printCommand: state.printCommand,
      printCommandLogger: state.printCommandLogger.createChild(),
      timeout: state.timeout,
      signal: state.signal,
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
  spawn(): CommandChild {
    // store a snapshot of the current command
    // in case someone wants to spawn multiple
    // commands with different state
    return parseAndSpawnCommand(this.#getClonedState());
  }

  /**
   * Register a command.
   */
  registerCommand(command: string, handleFn: CommandHandler): CommandBuilder {
    validateCommandName(command);
    return this.#newWithState((state) => {
      state.commands[command] = handleFn;
    });
  }

  /**
   * Register multilple commands.
   */
  registerCommands(commands: Record<string, CommandHandler>): CommandBuilder {
    let command: CommandBuilder = this;
    for (const [key, value] of Object.entries(commands)) {
      command = command.registerCommand(key, value);
    }
    return command;
  }

  /**
   * Unregister a command.
   */
  unregisterCommand(command: string): CommandBuilder {
    return this.#newWithState((state) => {
      delete state.commands[command];
    });
  }

  /** Sets the raw command to execute. */
  command(command: string | string[]): CommandBuilder {
    return this.#newWithState((state) => {
      if (command instanceof Array) {
        command = command.map(escapeArg).join(" ");
      }
      state.command = {
        text: command,
        fds: undefined,
      };
    });
  }

  /** The command should not throw for the provided non-zero exit codes. */
  noThrow(exclusionExitCode: number, ...additional: number[]): CommandBuilder;
  /** The command should not throw when it fails or times out. */
  noThrow(value?: boolean): CommandBuilder;
  noThrow(value?: boolean | number, ...additional: number[]): CommandBuilder {
    return this.#newWithState((state) => {
      if (typeof value === "boolean" || value == null) {
        state.noThrow = value ?? true;
      } else {
        state.noThrow = [value, ...additional];
      }
    });
  }

  /** Sets the command signal that will be passed to all commands
   * created with this command builder.
   */
  signal(killSignal: KillSignal): CommandBuilder {
    return this.#newWithState((state) => {
      if (state.signal != null) {
        state.signal.linkChild(killSignal);
      }
      state.signal = killSignal;
    });
  }

  /**
   * Whether to capture a combined buffer of both stdout and stderr.
   *
   * This will set both stdout and stderr to "piped" if not already "piped"
   * or "inheritPiped".
   */
  captureCombined(value = true): CommandBuilder {
    return this.#newWithState((state) => {
      state.combinedStdoutStderr = value;
      if (value) {
        if (state.stdout.kind !== "piped" && state.stdout.kind !== "inheritPiped") {
          state.stdout.kind = "piped";
        }
        if (state.stderr.kind !== "piped" && state.stderr.kind !== "inheritPiped") {
          state.stderr.kind = "piped";
        }
      }
    });
  }

  /**
   * Sets the stdin to use for the command.
   *
   * @remarks If multiple launches of a command occurs, then stdin will only be
   * read from the first consumed reader or readable stream and error otherwise.
   * For this reason, if you are setting stdin to something other than "inherit" or
   * "null", then it's recommended to set this each time you spawn a command.
   */
  stdin(reader: ShellPipeReaderKind): CommandBuilder {
    return this.#newWithState((state) => {
      if (reader === "inherit" || reader === "null") {
        state.stdin = reader;
      } else if (reader instanceof Uint8Array) {
        state.stdin = new Deferred(() => new Buffer(reader));
      } else if (reader instanceof Path) {
        state.stdin = new Deferred(async () => {
          const file = await reader.open();
          return file.readable;
        });
      } else if (reader instanceof RequestBuilder) {
        state.stdin = new Deferred(async () => {
          const body = await reader;
          return body.readable;
        });
      } else if (reader instanceof CommandBuilder) {
        state.stdin = new Deferred(() => {
          return reader.stdout("piped").spawn().stdout();
        });
      } else {
        state.stdin = new Box(reader);
      }
    });
  }

  /**
   * Sets the stdin string to use for a command.
   *
   * @remarks See the remarks on stdin. The same applies here.
   */
  stdinText(text: string): CommandBuilder {
    return this.stdin(new TextEncoder().encode(text));
  }

  /** Set the stdout kind. */
  stdout(kind: ShellPipeWriterKind): CommandBuilder;
  stdout(kind: WritableStream<Uint8Array>, options?: PipeOptions): CommandBuilder;
  stdout(kind: ShellPipeWriterKind, options?: PipeOptions): CommandBuilder {
    return this.#newWithState((state) => {
      if (state.combinedStdoutStderr && kind !== "piped" && kind !== "inheritPiped") {
        throw new Error(
          "Cannot set stdout's kind to anything but 'piped' or 'inheritPiped' when combined is true.",
        );
      }
      if (options?.signal != null) {
        // not sure what this would mean
        throw new Error("Setting a signal for a stdout WritableStream is not yet supported.");
      }
      state.stdout = {
        kind,
        options,
      };
    });
  }

  /** Set the stderr kind. */
  stderr(kind: ShellPipeWriterKind): CommandBuilder;
  stderr(kind: WritableStream<Uint8Array>, options?: PipeOptions): CommandBuilder;
  stderr(kind: ShellPipeWriterKind, options?: PipeOptions): CommandBuilder {
    return this.#newWithState((state) => {
      if (state.combinedStdoutStderr && kind !== "piped" && kind !== "inheritPiped") {
        throw new Error(
          "Cannot set stderr's kind to anything but 'piped' or 'inheritPiped' when combined is true.",
        );
      }
      if (options?.signal != null) {
        // not sure what this would mean
        throw new Error("Setting a signal for a stderr WritableStream is not yet supported.");
      }
      state.stderr = {
        kind,
        options,
      };
    });
  }

  /** Pipes the current command to the provided command returning the
   * provided command builder. When chaining, it's important to call this
   * after you are done configuring the current command or else you will
   * start modifying the provided command instead.
   *
   * @example
   * ```ts
   * const lineCount = await $`echo 1 && echo 2`
   *  .pipe($`wc -l`)
   *  .text();
   * ```
   */
  pipe(builder: CommandBuilder): CommandBuilder {
    return builder.stdin(this.stdout("piped"));
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
  cwd(dirPath: string | URL | Path): CommandBuilder {
    return this.#newWithState((state) => {
      state.cwd = dirPath instanceof URL
        ? path.fromFileUrl(dirPath)
        : dirPath instanceof Path
        ? dirPath.resolve().toString()
        : path.resolve(dirPath);
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
  exportEnv(value = true): CommandBuilder {
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
  printCommand(value = true): CommandBuilder {
    return this.#newWithState((state) => {
      state.printCommand = value;
    });
  }

  /**
   * Mutates the command builder to change the logger used
   * for `printCommand()`.
   */
  setPrintCommandLogger(logger: (...args: any[]) => void): void {
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
  quiet(kind: StreamKind | "both" = "combined"): CommandBuilder {
    kind = kind === "both" ? "combined" : kind;
    return this.#newWithState((state) => {
      if (kind === "combined" || kind === "stdout") {
        state.stdout.kind = getQuietKind(state.stdout.kind);
      }
      if (kind === "combined" || kind === "stderr") {
        state.stderr.kind = getQuietKind(state.stderr.kind);
      }
    });

    function getQuietKind(kind: ShellPipeWriterKind): ShellPipeWriterKind {
      if (typeof kind === "object") {
        return kind;
      }
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
  timeout(delay: Delay | undefined): CommandBuilder {
    return this.#newWithState((state) => {
      state.timeout = delay == null ? undefined : delayToMs(delay);
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
  async bytes(kind: StreamKind): Promise<Uint8Array> {
    const command = kind === "combined" ? this.quiet(kind).captureCombined() : this.quiet(kind);
    return (await command)[`${kind}Bytes`];
  }

  /**
   * Sets the provided stream (stdout by default) as quiet, spawns the command, and gets the stream as a string without the last newline.
   * Can be used to get stdout, stderr, or both.
   *
   * Shorthand for:
   *
   * ```ts
   * const data = (await $`command`.quiet("stdout")).stdout.replace(/\r?\n$/, "");
   * ```
   */
  async text(kind: StreamKind = "stdout"): Promise<string> {
    const command = kind === "combined" ? this.quiet(kind).captureCombined() : this.quiet(kind);
    return (await command)[kind].replace(/\r?\n$/, "");
  }

  /** Gets the text as an array of lines. */
  async lines(kind: StreamKind = "stdout"): Promise<string[]> {
    const text = await this.text(kind);
    return text.split(/\r?\n/g);
  }

  /**
   * Sets stream (stdout by default) as quiet, spawns the command, and gets stream as JSON.
   *
   * Shorthand for:
   *
   * ```ts
   * const data = (await $`command`.quiet("stdout")).stdoutJson;
   * ```
   */
  async json<TResult = any>(kind: Exclude<StreamKind, "combined"> = "stdout"): Promise<TResult> {
    return (await this.quiet(kind))[`${kind}Json`];
  }

  /** @internal */
  [getRegisteredCommandNamesSymbol](): string[] {
    return Object.keys(this.#state.commands);
  }

  /** @internal */
  [setCommandTextStateSymbol](textState: CommandBuilderStateCommand): CommandBuilder {
    return this.#newWithState((state) => {
      state.command = textState;
    });
  }
}

export class CommandChild extends Promise<CommandResult> {
  #pipedStdoutBuffer: PipedBuffer | "consumed" | undefined;
  #pipedStderrBuffer: PipedBuffer | "consumed" | undefined;
  #killSignalController: KillSignalController | undefined;

  /** @internal */
  constructor(executor: (resolve: (value: CommandResult) => void, reject: (reason?: any) => void) => void, options: {
    pipedStdoutBuffer: PipedBuffer | undefined;
    pipedStderrBuffer: PipedBuffer | undefined;
    killSignalController: KillSignalController | undefined;
  } = { pipedStderrBuffer: undefined, pipedStdoutBuffer: undefined, killSignalController: undefined }) {
    super(executor);
    this.#pipedStdoutBuffer = options.pipedStdoutBuffer;
    this.#pipedStderrBuffer = options.pipedStderrBuffer;
    this.#killSignalController = options.killSignalController;
  }

  /** Send a signal to the executing command's child process. Note that SIGTERM,
   * SIGKILL, SIGABRT, SIGQUIT, SIGINT, or SIGSTOP will cause the entire command
   * to be considered "aborted" and if part of a command runs after this has occurred
   * it will return a 124 exit code. Other signals will just be forwarded to the command.
   *
   * Defaults to "SIGTERM".
   */
  kill(signal?: Deno.Signal): void {
    this.#killSignalController?.kill(signal);
  }

  stdout(): ReadableStream<Uint8Array> {
    const buffer = this.#pipedStdoutBuffer;
    this.#assertBufferStreamable("stdout", buffer);
    this.#pipedStdoutBuffer = "consumed";
    this.catch(() => {
      // observe and ignore
    });
    return this.#bufferToStream(buffer);
  }

  stderr(): ReadableStream<Uint8Array> {
    const buffer = this.#pipedStderrBuffer;
    this.#assertBufferStreamable("stderr", buffer);
    this.#pipedStderrBuffer = "consumed";
    this.catch(() => {
      // observe and ignore
    });
    return this.#bufferToStream(buffer);
  }

  #assertBufferStreamable(name: string, buffer: PipedBuffer | "consumed" | undefined): asserts buffer is PipedBuffer {
    if (buffer == null) {
      throw new Error(
        `No pipe available. Ensure ${name} is "piped" (not "inheritPiped") and combinedOutput is not enabled.`,
      );
    }
    if (buffer === "consumed") {
      throw new Error(`Streamable ${name} was already consumed. Use the previously acquired stream instead.`);
    }
  }

  #bufferToStream(buffer: PipedBuffer) {
    const self = this;
    // todo(dsherret): stdout and stderr should use a pull model
    return new ReadableStream<Uint8Array>({
      start(controller) {
        buffer.setListener({
          writeSync(data) {
            controller.enqueue(data);
            return data.length;
          },
          setError(err: Error) {
            controller.error(err);
          },
          close() {
            controller.close();
          },
        });
      },
      cancel(_reason) {
        self.kill();
      },
    });
  }
}

export function parseAndSpawnCommand(state: CommandBuilderState) {
  if (state.command == null) {
    throw new Error("A command must be set before it can be spawned.");
  }

  if (state.printCommand) {
    state.printCommandLogger.getValue()(state.command.text);
  }

  const disposables: Disposable[] = [];
  const asyncDisposables: AsyncDisposable[] = [];

  const parentSignal = state.signal;
  const killSignalController = new KillSignalController();
  if (parentSignal != null) {
    const parentSignalListener = (signal: Deno.Signal) => {
      killSignalController.kill(signal);
    };
    parentSignal.addListener(parentSignalListener);
    disposables.push({
      [Symbol.dispose]() {
        parentSignal.removeListener(parentSignalListener);
      },
    });
  }
  let timedOut = false;
  if (state.timeout != null) {
    const timeoutId = setTimeout(() => {
      timedOut = true;
      killSignalController.kill();
    }, state.timeout);
    disposables.push({
      [Symbol.dispose]() {
        clearTimeout(timeoutId);
      },
    });
  }
  const [stdoutBuffer, stderrBuffer, combinedBuffer] = getBuffers();
  const stdout = new ShellPipeWriter(
    state.stdout.kind,
    stdoutBuffer === "null" ? new NullPipeWriter() : stdoutBuffer === "inherit" ? Deno.stdout : stdoutBuffer,
  );
  const stderr = new ShellPipeWriter(
    state.stderr.kind,
    stderrBuffer === "null" ? new NullPipeWriter() : stderrBuffer === "inherit" ? Deno.stderr : stderrBuffer,
  );
  const { text: commandText, fds } = state.command;
  const signal = killSignalController.signal;

  return new CommandChild(async (resolve, reject) => {
    try {
      const list = parseCommand(commandText);
      const stdin = await takeStdin();
      let code = await spawn(list, {
        stdin: stdin instanceof ReadableStream ? readerFromStreamReader(stdin.getReader()) : stdin,
        stdout,
        stderr,
        env: buildEnv(state.env),
        commands: state.commands,
        cwd: state.cwd ?? Deno.cwd(),
        exportEnv: state.exportEnv,
        signal,
        fds,
      });
      if (code !== 0) {
        if (timedOut) {
          // override the code in the case of a timeout that resulted in a failure
          code = 124;
        }
        const noThrow = state.noThrow instanceof Array ? state.noThrow.includes(code) : state.noThrow;
        if (!noThrow) {
          if (stdin instanceof ReadableStream) {
            if (!stdin.locked) {
              stdin.cancel();
            }
          }
          if (timedOut) {
            throw new Error(`Timed out with exit code: ${code}`);
          } else if (signal.aborted) {
            throw new Error(`${timedOut ? "Timed out" : "Aborted"} with exit code: ${code}`);
          } else {
            throw new Error(`Exited with code: ${code}`);
          }
        }
      }
      const result = new CommandResult(
        code,
        finalizeCommandResultBuffer(stdoutBuffer),
        finalizeCommandResultBuffer(stderrBuffer),
        combinedBuffer instanceof Buffer ? combinedBuffer : undefined,
      );
      const maybeError = await cleanupDisposablesAndMaybeGetError(undefined);
      if (maybeError) {
        reject(maybeError);
      } else {
        resolve(result);
      }
    } catch (err) {
      finalizeCommandResultBufferForError(stdoutBuffer, err as Error);
      finalizeCommandResultBufferForError(stderrBuffer, err as Error);
      reject(await cleanupDisposablesAndMaybeGetError(err));
    }
  }, {
    pipedStdoutBuffer: stdoutBuffer instanceof PipedBuffer ? stdoutBuffer : undefined,
    pipedStderrBuffer: stderrBuffer instanceof PipedBuffer ? stderrBuffer : undefined,
    killSignalController,
  });

  async function cleanupDisposablesAndMaybeGetError(maybeError?: unknown) {
    const errors = [];
    if (maybeError) {
      errors.push(maybeError);
    }
    for (const disposable of disposables) {
      try {
        disposable[Symbol.dispose]();
      } catch (err) {
        errors.push(err);
      }
    }
    if (asyncDisposables.length > 0) {
      await Promise.all(asyncDisposables.map(async (d) => {
        try {
          await d[Symbol.asyncDispose]();
        } catch (err) {
          errors.push(err);
        }
      }));
    }
    if (errors.length === 1) {
      return errors[0];
    } else if (errors.length > 1) {
      return new AggregateError(errors);
    } else {
      return undefined;
    }
  }

  async function takeStdin() {
    if (state.stdin instanceof Box) {
      const stdin = state.stdin.value;
      if (stdin === "consumed") {
        throw new Error(
          "Cannot spawn command. Stdin was already consumed when a previous command using " +
            "the same stdin was spawned. You need to call `.stdin(...)` again with a new " +
            "value before spawning.",
        );
      }
      state.stdin.value = "consumed";
      return stdin;
    } else if (state.stdin instanceof Deferred) {
      const stdin = await state.stdin.create();
      if (stdin instanceof ReadableStream) {
        asyncDisposables.push({
          async [Symbol.asyncDispose]() {
            if (!stdin.locked) {
              await stdin.cancel();
            }
          },
        });
      }
      return stdin;
    } else {
      return state.stdin;
    }
  }

  function getBuffers() {
    const hasProgressBars = isShowingProgressBars();
    const stdoutBuffer = getOutputBuffer(Deno.stdout, state.stdout);
    const stderrBuffer = getOutputBuffer(Deno.stderr, state.stderr);
    if (state.combinedStdoutStderr) {
      if (typeof stdoutBuffer === "string" || typeof stderrBuffer === "string") {
        throw new Error("Internal programming error. Expected writers for stdout and stderr.");
      }
      const combinedBuffer = new Buffer();
      return [
        getCapturingBuffer(stdoutBuffer, combinedBuffer),
        getCapturingBuffer(stderrBuffer, combinedBuffer),
        combinedBuffer,
      ] as const;
    }
    return [stdoutBuffer, stderrBuffer, undefined] as const;

    function getCapturingBuffer(buffer: Writer | WriterSync, combinedBuffer: Buffer) {
      if ("write" in buffer) {
        return new CapturingBufferWriter(buffer, combinedBuffer);
      } else {
        return new CapturingBufferWriterSync(buffer, combinedBuffer);
      }
    }

    function getOutputBuffer(inheritWriter: WriterSync, { kind, options }: ShellPipeWriterKindWithOptions) {
      if (typeof kind === "object") {
        if (kind instanceof Path) {
          const file = kind.openSync({ write: true, truncate: true, create: true });
          disposables.push(file);
          return file;
        } else if (kind instanceof WritableStream) {
          const streamWriter = kind.getWriter();
          asyncDisposables.push({
            async [Symbol.asyncDispose]() {
              streamWriter.releaseLock();
              if (!options?.preventClose) {
                try {
                  await kind.close();
                } catch {
                  // ignore, the stream have errored
                }
              }
            },
          });
          return writerFromStreamWriter(streamWriter);
        } else {
          return kind;
        }
      }
      switch (kind) {
        case "inherit":
          if (hasProgressBars) {
            return new InheritStaticTextBypassWriter(inheritWriter);
          } else {
            return "inherit";
          }
        case "piped":
          return new PipedBuffer();
        case "inheritPiped":
          return new CapturingBufferWriterSync(inheritWriter, new Buffer());
        case "null":
          return "null";
        default: {
          const _assertNever: never = kind;
          throw new Error("Unhandled.");
        }
      }
    }
  }

  function finalizeCommandResultBuffer(
    buffer:
      | PipedBuffer
      | "inherit"
      | "null"
      | CapturingBufferWriter
      | CapturingBufferWriterSync
      | InheritStaticTextBypassWriter
      | Writer
      | WriterSync,
  ): BufferStdio {
    if (buffer instanceof CapturingBufferWriterSync || buffer instanceof CapturingBufferWriter) {
      return buffer.getBuffer();
    } else if (buffer instanceof InheritStaticTextBypassWriter) {
      buffer.flush(); // this is line buffered, so flush anything left
      return "inherit";
    } else if (buffer instanceof PipedBuffer) {
      buffer.close();
      return buffer.getBuffer() ?? "streamed";
    } else if (typeof buffer === "object") {
      return "streamed";
    } else {
      return buffer;
    }
  }

  function finalizeCommandResultBufferForError(
    buffer:
      | PipedBuffer
      | "inherit"
      | "null"
      | CapturingBufferWriter
      | CapturingBufferWriterSync
      | InheritStaticTextBypassWriter
      | Writer
      | WriterSync,
    error: Error,
  ) {
    if (buffer instanceof InheritStaticTextBypassWriter) {
      buffer.flush(); // this is line buffered, so flush anything left
    } else if (buffer instanceof PipedBuffer) {
      buffer.setError(error);
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

  /** @internal */
  constructor(code: number, stdout: BufferStdio, stderr: BufferStdio, combined: Buffer | undefined) {
    this.code = code;
    this.#stdout = stdout;
    this.#stderr = stderr;
    this.#combined = combined;
  }

  #memoizedStdout: string | undefined;

  /** Raw decoded stdout text. */
  get stdout(): string {
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
  get stdoutJson(): any {
    if (this.#memoizedStdoutJson == null) {
      this.#memoizedStdoutJson = JSON.parse(this.stdout);
    }
    return this.#memoizedStdoutJson;
  }

  /** Raw stdout bytes. */
  get stdoutBytes(): Uint8Array {
    if (this.#stdout === "streamed") {
      throw new Error(
        `Stdout was streamed to another source and is no longer available.`,
      );
    }
    if (typeof this.#stdout === "string") {
      throw new Error(
        `Stdout was not piped (was ${this.#stdout}). Call .stdout("piped") or .stdout("inheritPiped") when building the command.`,
      );
    }
    return this.#stdout.bytes({ copy: false });
  }

  #memoizedStderr: string | undefined;

  /** Raw decoded stdout text. */
  get stderr(): string {
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
  get stderrJson(): any {
    if (this.#memoizedStderrJson == null) {
      this.#memoizedStderrJson = JSON.parse(this.stderr);
    }
    return this.#memoizedStderrJson;
  }

  /** Raw stderr bytes. */
  get stderrBytes(): Uint8Array {
    if (this.#stderr === "streamed") {
      throw new Error(
        `Stderr was streamed to another source and is no longer available.`,
      );
    }
    if (typeof this.#stderr === "string") {
      throw new Error(
        `Stderr was not piped (was ${this.#stderr}). Call .stderr("piped") or .stderr("inheritPiped") when building the command.`,
      );
    }
    return this.#stderr.bytes({ copy: false });
  }

  #memoizedCombined: string | undefined;

  /** Raw combined stdout and stderr text. */
  get combined(): string {
    if (!this.#memoizedCombined) {
      this.#memoizedCombined = textDecoder.decode(this.combinedBytes);
    }
    return this.#memoizedCombined;
  }

  /** Raw combined stdout and stderr bytes. */
  get combinedBytes(): Uint8Array {
    if (this.#combined == null) {
      throw new Error("Stdout and stderr were not combined. Call .captureCombined() when building the command.");
    }
    return this.#combined.bytes({ copy: false });
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
  if (/^[A-Za-z0-9]+$/.test(arg)) {
    return arg;
  } else {
    return `'${arg.replaceAll("'", `'"'"'`)}'`;
  }
}

function validateCommandName(command: string) {
  if (command.match(/^[a-zA-Z0-9-_]+$/) == null) {
    throw new Error("Invalid command name");
  }
}

const SHELL_SIGNAL_CTOR_SYMBOL = Symbol();

interface KillSignalState {
  abortedCode: number | undefined;
  listeners: ((signal: Deno.Signal) => void)[];
}

/** Similar to an AbortController, but for sending signals to commands. */
export class KillSignalController {
  #state: KillSignalState;
  #killSignal: KillSignal;

  constructor() {
    this.#state = {
      abortedCode: undefined,
      listeners: [],
    };
    this.#killSignal = new KillSignal(SHELL_SIGNAL_CTOR_SYMBOL, this.#state);
  }

  get signal(): KillSignal {
    return this.#killSignal;
  }

  /** Send a signal to the downstream child process. Note that SIGTERM,
   * SIGKILL, SIGABRT, SIGQUIT, SIGINT, or SIGSTOP will cause all the commands
   * to be considered "aborted" and will return a 124 exit code, while other
   * signals will just be forwarded to the commands.
   */
  kill(signal: Deno.Signal = "SIGTERM") {
    sendSignalToState(this.#state, signal);
  }
}

/** Listener for when a KillSignal is killed. */
export type KillSignalListener = (signal: Deno.Signal) => void;

/** Similar to `AbortSignal`, but for `Deno.Signal`.
 *
 * A `KillSignal` is considered aborted if its controller
 * receives SIGTERM, SIGKILL, SIGABRT, SIGQUIT, SIGINT, or SIGSTOP.
 *
 * These can be created via a `KillSignalController`.
 */
export class KillSignal {
  #state: KillSignalState;

  /** @internal */
  constructor(symbol: Symbol, state: KillSignalState) {
    if (symbol !== SHELL_SIGNAL_CTOR_SYMBOL) {
      throw new Error("Constructing instances of KillSignal is not permitted.");
    }
    this.#state = state;
  }

  /** Returns if the command signal has ever received a SIGTERM,
   * SIGKILL, SIGABRT, SIGQUIT, SIGINT, or SIGSTOP
   */
  get aborted(): boolean {
    return this.#state.abortedCode !== undefined;
  }

  /** Gets the exit code to use if aborted. */
  get abortedExitCode(): number | undefined {
    return this.#state.abortedCode;
  }

  /**
   * Causes the provided kill signal to be triggered when this
   * signal receives a signal.
   */
  linkChild(killSignal: KillSignal): { unsubscribe(): void } {
    const listener = (signal: Deno.Signal) => {
      sendSignalToState(killSignal.#state, signal);
    };
    this.addListener(listener);
    return {
      unsubscribe: () => {
        this.removeListener(listener);
      },
    };
  }

  addListener(listener: KillSignalListener) {
    this.#state.listeners.push(listener);
  }

  removeListener(listener: KillSignalListener) {
    const index = this.#state.listeners.indexOf(listener);
    if (index >= 0) {
      this.#state.listeners.splice(index, 1);
    }
  }
}

function sendSignalToState(state: KillSignalState, signal: Deno.Signal) {
  const code = getSignalAbortCode(signal);
  if (code !== undefined) {
    state.abortedCode = code;
  }
  for (const listener of state.listeners) {
    listener(signal);
  }
}

export function getSignalAbortCode(signal: Deno.Signal) {
  // consider the command aborted if the signal is any one of these
  switch (signal) {
    case "SIGTERM":
      return 128 + 15;
    case "SIGKILL":
      return 128 + 9;
    case "SIGABRT":
      return 128 + 6;
    case "SIGQUIT":
      return 128 + 3;
    case "SIGINT":
      return 128 + 2;
    case "SIGSTOP":
      // should SIGSTOP be considered an abort?
      return 128 + 19;
    default:
      return undefined;
  }
}

export function template(strings: TemplateStringsArray, exprs: TemplateExpr[]) {
  return templateInner(strings, exprs, escapeArg);
}

export function templateRaw(strings: TemplateStringsArray, exprs: TemplateExpr[]) {
  return templateInner(strings, exprs, undefined);
}

export type TemplateExpr =
  | string
  | number
  | boolean
  | Path
  | Uint8Array
  | CommandResult
  | { toString(): string }
  | (string | number | boolean | Path | { toString(): string })[]
  | ReadableStream<Uint8Array>
  | {
    // type is unfortuantely not that great
    [readable: symbol]: () => ReadableStream<Uint8Array>;
  }
  | (() => ReadableStream<Uint8Array>)
  // for input redirects only
  | {
    // type is unfortuantely not that great
    [writable: symbol]: () => WritableStream<Uint8Array>;
  }
  | WritableStream<Uint8Array>
  | (() => WritableStream<Uint8Array>);

function templateInner(
  strings: TemplateStringsArray,
  exprs: TemplateExpr[],
  escape: ((arg: string) => string) | undefined,
): CommandBuilderStateCommand {
  let nextStreamFd = 3;
  let text = "";
  let streams: StreamFds | undefined;
  const exprsCount = exprs.length;
  for (let i = 0; i < Math.max(strings.length, exprs.length); i++) {
    if (strings.length > i) {
      text += strings[i];
    }
    if (exprs.length > i) {
      try {
        const expr = exprs[i];
        if (expr == null) {
          throw "Expression was null or undefined.";
        }
        const inputOrOutputRedirect = detectInputOrOutputRedirect(text);
        if (inputOrOutputRedirect === "<") {
          if (expr instanceof Path) {
            text += templateLiteralExprToString(expr, escape);
          } else if (typeof expr === "string") {
            handleReadableStream(() =>
              new ReadableStream({
                start(controller) {
                  controller.enqueue(new TextEncoder().encode(expr));
                  controller.close();
                },
              })
            );
          } else if (expr instanceof ReadableStream) {
            handleReadableStream(() => expr);
          } else if ((expr as any)?.[symbols.readable]) {
            handleReadableStream(() => {
              const stream = (expr as any)[symbols.readable]?.();
              if (!(stream instanceof ReadableStream)) {
                throw new Error(
                  "Expected a ReadableStream or an object with a [$.symbols.readable] method " +
                    `that returns a ReadableStream at expression ${i + 1}/${exprsCount}.`,
                );
              }
              return stream;
            });
          } else if (expr instanceof Uint8Array) {
            handleReadableStream(() => {
              return new ReadableStream({
                start(controller) {
                  controller.enqueue(expr);
                  controller.close();
                },
              });
            });
          } else if (expr instanceof Response) {
            handleReadableStream(() => {
              return expr.body ?? new ReadableStream({
                start(controller) {
                  controller.close();
                },
              });
            });
          } else if (expr instanceof Function) {
            handleReadableStream(() => {
              try {
                const result = expr();
                if (!(result instanceof ReadableStream)) {
                  throw new Error("Function did not return a ReadableStream.");
                }
                return result;
              } catch (err) {
                throw new Error(
                  `Error getting ReadableStream from function at ` +
                    `expression ${i + 1}/${exprsCount}. ${errorToString(err)}`,
                );
              }
            });
          } else {
            throw new Error("Unsupported object provided to input redirect.");
          }
        } else if (inputOrOutputRedirect === ">") {
          if (expr instanceof Path) {
            text += templateLiteralExprToString(expr, escape);
          } else if (expr instanceof WritableStream) {
            handleWritableStream(() => expr);
          } else if (expr instanceof Uint8Array) {
            let pos = 0;
            handleWritableStream(() => {
              return new WritableStream<Uint8Array>({
                write(chunk) {
                  const nextPos = chunk.length + pos;
                  if (nextPos > expr.length) {
                    const chunkLength = expr.length - pos;
                    expr.set(chunk.slice(0, chunkLength), pos); // fill as much as we can
                    throw new Error(`Overflow writing ${nextPos} bytes to Uint8Array (length: ${exprsCount}).`);
                  }
                  expr.set(chunk, pos);
                  pos = nextPos;
                },
              });
            });
          } else if ((expr as any)?.[symbols.writable]) {
            handleWritableStream(() => {
              const stream = (expr as any)[symbols.writable]?.();
              if (!(stream instanceof WritableStream)) {
                throw new Error(
                  `Expected a WritableStream or an object with a [$.symbols.writable] method ` +
                    `that returns a WritableStream at expression ${i + 1}/${exprsCount}.`,
                );
              }
              return stream;
            });
          } else if (expr instanceof Function) {
            handleWritableStream(() => {
              try {
                const result = expr();
                if (!(result instanceof WritableStream)) {
                  throw new Error("Function did not return a WritableStream.");
                }
                return result;
              } catch (err) {
                throw new Error(
                  `Error getting WritableStream from function at ` +
                    `expression ${i + 1}/${exprsCount}. ${errorToString(err)}`,
                );
              }
            });
          } else if (typeof expr === "string") {
            throw new Error(
              "Cannot provide strings to output redirects. Did you mean to provide a path instead via the `$.path(...)` API?",
            );
          } else {
            throw new Error("Unsupported object provided to output redirect.");
          }
        } else {
          text += templateLiteralExprToString(expr, escape);
        }
      } catch (err) {
        const startMessage = exprsCount === 1
          ? "Failed resolving expression in command."
          : `Failed resolving expression ${i + 1}/${exprsCount} in command.`;
        throw new Error(`${startMessage} ${errorToString(err)}`);
      }
    }
  }
  return {
    text,
    fds: streams,
  };

  function handleReadableStream(createStream: () => ReadableStream) {
    streams ??= new StreamFds();
    const fd = nextStreamFd++;
    streams.insertReader(fd, () => {
      const reader = createStream().getReader();
      return {
        ...readerFromStreamReader(reader),
        [Symbol.dispose]() {
          reader.releaseLock();
        },
      };
    });
    text = text.trimEnd() + "&" + fd;
  }

  function handleWritableStream(createStream: () => WritableStream) {
    streams ??= new StreamFds();
    const fd = nextStreamFd++;
    streams.insertWriter(fd, () => {
      const stream = createStream();
      const writer = stream.getWriter();
      return {
        ...writerFromStreamWriter(writer),
        async [Symbol.asyncDispose]() {
          writer.releaseLock();
          try {
            await stream.close();
          } catch {
            // ignore, the stream may have errored
          }
        },
      };
    });
    text = text.trimEnd() + "&" + fd;
  }
}

function detectInputOrOutputRedirect(text: string) {
  text = text.trimEnd();
  if (text.endsWith(">")) {
    return ">";
  } else if (text.endsWith("<")) {
    return "<";
  } else {
    return undefined;
  }
}

function templateLiteralExprToString(expr: TemplateExpr, escape: ((arg: string) => string) | undefined): string {
  let result: string;
  if (typeof expr === "string") {
    result = expr;
  } else if (expr instanceof Array) {
    return expr.map((e) => templateLiteralExprToString(e, escape)).join(" ");
  } else if (expr instanceof CommandResult) {
    // remove last newline
    result = expr.stdout.replace(/\r?\n$/, "");
  } else if (expr instanceof CommandBuilder) {
    throw new Error(
      "Providing a command builder is not yet supported (https://github.com/dsherret/dax/issues/239). " +
        "Await the command builder's text before using it in an expression (ex. await $`cmd`.text()).",
    );
  } else if (typeof expr === "object" && expr.toString === Object.prototype.toString) {
    throw new Error("Provided object does not override `toString()`.");
  } else {
    result = `${expr}`;
  }
  return escape ? escape(result) : result;
}
