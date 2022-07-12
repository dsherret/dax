import { Buffer, fs, path, which, whichSync } from "./src/deps.ts";
import { NullPipeWriter, ShellPipeReader, ShellPipeWriter, ShellPipeWriterKind } from "./src/pipes.ts";
import { parseArgs, spawn } from "./src/shell.ts";

const textDecoder = new TextDecoder();

export interface $Type {
  (strings: TemplateStringsArray, ...exprs: any[]): CommandBuilder;
  cd(path: string | URL): void;
  echo: typeof console.log;
  fs: typeof fs;
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
  env: { [name: string]: string };
  cwd: string;
}

export class CommandBuilder implements PromiseLike<CommandResult> {
  #state: CommandBuilderState | undefined;

  #getState() {
    if (this.#state == null) {
      this.#state = {
        command: undefined,
        stdin: "inherit",
        stdoutKind: "pipe",
        stderrKind: "inherit",
        noThrow: false,
        env: Deno.env.toObject(),
        cwd: Deno.cwd(),
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

  env(items: { [name: string]: string | undefined }): this;
  env(name: string, value: string | undefined): this;
  env(nameOrItems: string | { [name: string]: string | undefined }, value?: string) {
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
}

async function parseAndSpawnCommand(state: CommandBuilderState) {
  if (state.command == null) {
    throw new Error("A command must be set before it can be spawned.");
  }

  const stdoutBuffer = state.stdoutKind === "null"
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
  const stderrBuffer = state.stderrKind === "null"
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
  });
  if (code !== 0 && !state.noThrow) {
    throw new Error(`Exited with error code: ${code}`);
  }
  return new CommandResult(code, stdoutBuffer, stderrBuffer);
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

const helperObject = {
  fs,
  path,
  cd,
  echo(...data: any[]) {
    console.log(...data);
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
        result += `${exprs[i]}`;
      }
    }
    return ownedStartingBuilder.clone().command(result);
  }, helperObject);
}

export const $: $Type = create$(new CommandBuilder());
export default $;
