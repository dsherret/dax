// node.js compatibility layer replacing Deno global APIs
import * as fs from "node:fs";
import * as os from "node:os";
import * as nodePath from "node:path";
import { Readable } from "node:stream";
import * as nodeUtil from "node:util";

export const isWindows = process.platform === "win32";

/** Replaces `Deno.Signal`. */
export type Signal =
  | "SIGABRT"
  | "SIGALRM"
  | "SIGBREAK"
  | "SIGBUS"
  | "SIGCHLD"
  | "SIGCONT"
  | "SIGEMT"
  | "SIGFPE"
  | "SIGHUP"
  | "SIGILL"
  | "SIGINFO"
  | "SIGINT"
  | "SIGIO"
  | "SIGKILL"
  | "SIGLOST"
  | "SIGPIPE"
  | "SIGPOLL"
  | "SIGPROF"
  | "SIGPWR"
  | "SIGQUIT"
  | "SIGSEGV"
  | "SIGSTKFLT"
  | "SIGSTOP"
  | "SIGSYS"
  | "SIGTERM"
  | "SIGTRAP"
  | "SIGTSTP"
  | "SIGTTIN"
  | "SIGTTOU"
  | "SIGURG"
  | "SIGUSR1"
  | "SIGUSR2"
  | "SIGVTALRM"
  | "SIGWINCH"
  | "SIGXCPU"
  | "SIGXFSZ";

/** Replaces `Deno.WriteFileOptions`. */
export interface WriteFileOptions {
  append?: boolean;
  create?: boolean;
  createNew?: boolean;
  mode?: number;
  signal?: AbortSignal;
}

export interface FileInfo {
  isFile: boolean;
  isDirectory: boolean;
  isSymlink: boolean;
  size: number;
}

/** File handle implementing Reader/Writer/WriterSync/Closer interfaces. Replaces `Deno.FsFile`. */
export class FsFile {
  #fd: number;

  constructor(fd: number) {
    this.#fd = fd;
  }

  read(p: Uint8Array): Promise<number | null> {
    const bytesRead = fs.readSync(this.#fd, p);
    return Promise.resolve(bytesRead === 0 ? null : bytesRead);
  }

  readSync(p: Uint8Array): number | null {
    const bytesRead = fs.readSync(this.#fd, p);
    return bytesRead === 0 ? null : bytesRead;
  }

  write(p: Uint8Array): Promise<number> {
    return Promise.resolve(fs.writeSync(this.#fd, p));
  }

  writeSync(p: Uint8Array): number {
    return fs.writeSync(this.#fd, p);
  }

  close(): void {
    try {
      fs.closeSync(this.#fd);
    } catch {
      // ignore
    }
  }

  get writable(): WritableStream<Uint8Array> {
    const fd = this.#fd;
    return new WritableStream({
      write(chunk) {
        fs.writeSync(fd, chunk);
      },
    });
  }

  [Symbol.dispose](): void {
    this.close();
  }
}

interface OpenOptions {
  read?: boolean;
  write?: boolean;
  create?: boolean;
  truncate?: boolean;
  append?: boolean;
}

function openOptionsToFlags(options: OpenOptions): string {
  if (options.read && !options.write) return "r";
  if (options.write && options.append && options.create) return "a";
  if (options.write && options.append) return "a";
  if (options.write && options.create && options.truncate) return "w";
  if (options.write && options.create) return "w";
  if (options.write) return "r+";
  return "r";
}

/** Replaces `Deno.open()`. */
export async function open(filePath: string, options: OpenOptions): Promise<FsFile> {
  const flags = openOptionsToFlags(options);
  const fd = fs.openSync(filePath, flags);
  return new FsFile(fd);
}

/** Replaces `Deno.create()`. */
export async function create(filePath: string): Promise<FsFile> {
  const fd = fs.openSync(filePath, "w");
  return new FsFile(fd);
}

// stdin wrapper (replaces Deno.stdin)
export const stdin = {
  read(p: Uint8Array): Promise<number | null> {
    const bytesRead = fs.readSync(0, p);
    return Promise.resolve(bytesRead === 0 ? null : bytesRead);
  },
  get readable(): ReadableStream<Uint8Array> {
    return Readable.toWeb(process.stdin) as ReadableStream<Uint8Array>;
  },
  setRaw(mode: boolean): void {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(mode);
    }
  },
  isTerminal(): boolean {
    return process.stdin.isTTY ?? false;
  },
};

// stdout wrapper (replaces Deno.stdout)
export const stdout = {
  write(p: Uint8Array): Promise<number> {
    return Promise.resolve(fs.writeSync(1, p));
  },
  writeSync(p: Uint8Array): number {
    return fs.writeSync(1, p);
  },
  isTerminal(): boolean {
    return process.stdout.isTTY ?? false;
  },
};

// stderr wrapper (replaces Deno.stderr)
export const stderr = {
  write(p: Uint8Array): Promise<number> {
    return Promise.resolve(fs.writeSync(2, p));
  },
  writeSync(p: Uint8Array): number {
    return fs.writeSync(2, p);
  },
  isTerminal(): boolean {
    return process.stderr.isTTY ?? false;
  },
};

/** Replaces `Deno.inspect()`. */
export function inspect(value: unknown, options?: nodeUtil.InspectOptions): string {
  return nodeUtil.inspect(value, options);
}

/** Replaces `Deno.consoleSize()`. */
export function consoleSize(): { columns: number; rows: number } {
  return {
    columns: process.stdout.columns ?? 80,
    rows: process.stdout.rows ?? 24,
  };
}

// error type checking (replaces instanceof Deno.errors.*)

export function isNotFoundError(err: unknown): boolean {
  return (err as any)?.code === "ENOENT";
}

export function isAlreadyExistsError(err: unknown): boolean {
  return (err as any)?.code === "EEXIST";
}

export function isPermissionDeniedError(err: unknown): boolean {
  return (err as any)?.code === "EACCES" || (err as any)?.code === "EPERM";
}

// filesystem operations

export function existsSync(filePath: string): boolean {
  return fs.existsSync(filePath);
}

/** Replaces `Deno.lstat()`. */
export async function lstat(filePath: string): Promise<FileInfo> {
  const s = await fs.promises.lstat(filePath);
  return { isFile: s.isFile(), isDirectory: s.isDirectory(), isSymlink: s.isSymbolicLink(), size: s.size };
}

/** Replaces `Deno.stat()`. */
export async function stat(filePath: string): Promise<FileInfo> {
  const s = await fs.promises.stat(filePath);
  return { isFile: s.isFile(), isDirectory: s.isDirectory(), isSymlink: s.isSymbolicLink(), size: s.size };
}

/** Replaces `Deno.mkdir()`. */
export async function mkdir(dirPath: string, options?: { recursive?: boolean }): Promise<void> {
  await fs.promises.mkdir(dirPath, options);
}

/** Replaces `Deno.remove()`. */
export async function remove(filePath: string, options?: { recursive?: boolean }): Promise<void> {
  if (options?.recursive) {
    await fs.promises.rm(filePath, options);
    return;
  }
  // match Deno.remove semantics — remove files or empty directories
  const stat = await fs.promises.lstat(filePath);
  if (stat.isDirectory()) {
    await fs.promises.rmdir(filePath);
  } else {
    await fs.promises.rm(filePath);
  }
}

/** Replaces `Deno.rename()`. */
export async function rename(from: string, to: string): Promise<void> {
  await fs.promises.rename(from, to);
}

/** Replaces `Deno.copyFile()`. */
export async function copyFile(from: string, to: string): Promise<void> {
  await fs.promises.copyFile(from, to);
}

/** Replaces `Deno.readDir()`. */
export async function* readDir(dirPath: string): AsyncGenerator<FileInfo & { name: string }> {
  const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    yield {
      name: entry.name,
      isFile: entry.isFile(),
      isDirectory: entry.isDirectory(),
      isSymlink: entry.isSymbolicLink(),
      size: 0, // not available from readdir
    };
  }
}

/** Replaces `Deno.makeTempDirSync()`. */
export function makeTempDirSync(): string {
  return fs.mkdtempSync(nodePath.join(os.tmpdir(), "dax-"));
}

/** Replaces `Deno.makeTempDir()`. */
export async function makeTempDir(): Promise<string> {
  return await fs.promises.mkdtemp(nodePath.join(os.tmpdir(), "dax-"));
}

/** Replaces `Deno.makeTempFile()`. */
export async function makeTempFile(): Promise<string> {
  const dir = await fs.promises.mkdtemp(nodePath.join(os.tmpdir(), "dax-"));
  const filePath = nodePath.join(dir, "tmp");
  await fs.promises.writeFile(filePath, "");
  return filePath;
}

/** Replaces `Deno.writeFile()`. */
export async function writeFile(filePath: string, data: Uint8Array): Promise<void> {
  await fs.promises.writeFile(filePath, data);
}

/** Replaces `Deno.writeTextFile()`. */
export async function writeTextFile(filePath: string, data: string): Promise<void> {
  await fs.promises.writeFile(filePath, data);
}

/** Replaces `Deno.symlink()`. */
export async function symlink(target: string, linkPath: string): Promise<void> {
  await fs.promises.symlink(target, linkPath);
}

/** Replaces `Deno.execPath()`. */
export function execPath(): string {
  return process.execPath;
}

/**
 * Returns the OS name in Deno-style format (for which library compatibility).
 * Replaces `Deno.build.os`.
 */
export type OsType = "aix" | "android" | "darwin" | "freebsd" | "linux" | "netbsd" | "windows" | "solaris" | "illumos";

export function buildOs(): OsType {
  const p = process.platform;
  if (p === "win32") return "windows";
  if (p === "sunos") return "solaris";
  return p as OsType;
}

export function cwd(): string {
  return process.cwd();
}

export function chdir(dir: string): void {
  process.chdir(dir);
}

export function exit(code: number): never {
  process.exit(code);
}

export const env = {
  get(key: string): string | undefined {
    return process.env[key];
  },
  set(key: string, value: string): void {
    process.env[key] = value;
  },
  delete(key: string): void {
    delete process.env[key];
  },
  toObject(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(process.env)) {
      if (value !== undefined) {
        result[key] = value;
      }
    }
    return result;
  },
};
