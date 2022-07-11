import { Buffer, fs, path, which, whichSync } from "./src/deps.ts";
import { NullPipeWriter, ShellPipeReader, ShellPipeWriter } from "./src/pipes.ts";
import { parseArgs, spawn } from "./src/shell.ts";

const textDecoder = new TextDecoder();

export interface $Type {
  (strings: TemplateStringsArray, ...exprs: string[]): CommandPromise;
  cd(path: string | URL): void;
  fs: typeof fs;
  path: typeof path;
  sleep(ms: number): Promise<void>;
  withRetries<TReturn>(params: RetryParams<TReturn>): Promise<TReturn>;
  which: typeof which;
  whichSync: typeof whichSync;
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

export const $: $Type = Object.assign(
  (strings: TemplateStringsArray, ...exprs: string[]) => {
    const parts = [];
    for (let i = 0; i < Math.max(strings.length, exprs.length); i++) {
      if (strings.length > i) {
        parts.push(strings[i]);
      }
      if (exprs.length > i) {
        parts.push(`"${exprs[i].replace(`"`, `\\"`)}"`);
      }
    }
    const command = parts.join(" ");
    return new CommandPromise(command);
  },
  {
    fs,
    path,
    cd,
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
  },
);
export default $;

type BufferStdio = "inherit" | "null" | Buffer;

export class CommandPromise implements PromiseLike<CommandResult> {
  #command: string;
  #stdin: ShellPipeReader = "inherit";
  #stdout: BufferStdio = new Buffer();
  #stderr: BufferStdio = "inherit";
  #nothrow = false;
  #env: { [name: string]: string } = Deno.env.toObject();
  #cwd: string = Deno.cwd();

  constructor(command: string) {
    this.#command = command;
  }

  then<TResult1 = CommandResult, TResult2 = never>(
    onfulfilled?: ((value: CommandResult) => TResult1 | PromiseLike<TResult1>) | null | undefined,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null | undefined,
  ): PromiseLike<TResult1 | TResult2> {
    return this.spawn().then(onfulfilled).catch(onrejected);
  }

  async spawn(): Promise<CommandResult> {
    const list = await parseArgs(this.#command);
    const stdout = this.#stdout === "null"
      ? new ShellPipeWriter("null", new NullPipeWriter())
      : this.#stdout === "inherit"
      ? new ShellPipeWriter("inherit", Deno.stdout)
      : new ShellPipeWriter("writer", this.#stdout);
    const stderr = this.#stderr === "null"
      ? new ShellPipeWriter("null", new NullPipeWriter())
      : this.#stderr === "inherit"
      ? new ShellPipeWriter("inherit", Deno.stderr)
      : new ShellPipeWriter("writer", this.#stderr);
    const code = await spawn(list, {
      stdin: this.#stdin,
      stdout,
      stderr,
      env: this.#env,
      cwd: this.#cwd,
    });
    if (code !== 0 && !this.#nothrow) {
      throw new Error(`Exited with error code: ${code}`);
    }
    return new CommandResult(code, this.#stdout, this.#stderr);
  }

  nothrow(): this {
    this.#nothrow = true;
    return this;
  }

  stdout(kind: "pipe" | "inherit" | "null") {
    if (kind === "pipe") {
      this.#stdout = new Buffer();
    } else {
      this.#stdout = kind;
    }
    return this;
  }

  stderr(kind: "pipe" | "inherit" | "null") {
    if (kind === "pipe") {
      this.#stderr = new Buffer();
    } else {
      this.#stderr = kind;
    }
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
      delete this.#env[key];
    } else {
      this.#env[key] = value;
    }
  }

  cwd(dirPath: string) {
    this.#cwd = path.resolve(dirPath);
  }
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

  get stdoutJson() {
    return JSON.parse(this.stdout);
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

  get stderrJson() {
    return JSON.parse(this.stderr);
  }

  get stderrBytes(): Uint8Array {
    if (typeof this.#stderr === "string") {
      throw new Error(`Stderr was not piped (was ${this.#stderr}). Call .stderr("pipe") on the process.`);
    }
    return this.#stderr.bytes();
  }
}
