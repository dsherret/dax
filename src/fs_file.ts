import * as fs from "node:fs";
import { setImmediate } from "node:timers";
import * as nodeUtil from "node:util";

const openAsync = nodeUtil.promisify(fs.open);

/** Options for writing a file, used by `RequestBuilder#pipeToPath`. */
export interface WriteFileOptions {
  append?: boolean;
  create?: boolean;
  createNew?: boolean;
  mode?: number;
  signal?: AbortSignal;
}

export interface OpenOptions {
  read?: boolean;
  write?: boolean;
  create?: boolean;
  truncate?: boolean;
  append?: boolean;
}

/** File handle implementing Reader/Writer/WriterSync/Closer interfaces. */
export class FsFile {
  #fd: number;

  constructor(fd: number) {
    this.#fd = fd;
  }

  read(p: Uint8Array): Promise<number | null> {
    return new Promise((resolve, reject) => {
      fs.read(this.#fd, p, 0, p.length, null, (err, bytesRead) => {
        if (err) reject(err);
        else resolve(bytesRead === 0 ? null : bytesRead);
      });
    });
  }

  readSync(p: Uint8Array): number | null {
    const bytesRead = fs.readSync(this.#fd, p);
    return bytesRead === 0 ? null : bytesRead;
  }

  write(p: Uint8Array): Promise<number> {
    return writeAll(this.#fd, p);
  }

  writeSync(p: Uint8Array): number {
    return writeSyncAll(this.#fd, p);
  }

  close(): void {
    try {
      fs.closeSync(this.#fd);
    } catch {
      // ignore
    }
  }

  get writable(): WritableStream<Uint8Array> {
    const write = this.write.bind(this);
    return new WritableStream({
      async write(chunk) {
        await write(chunk);
      },
    });
  }

  [Symbol.dispose](): void {
    this.close();
  }
}

export async function open(filePath: string, options: OpenOptions): Promise<FsFile> {
  const fd = await openAsync(filePath, openOptionsToFlags(options));
  return new FsFile(fd);
}

export async function create(filePath: string): Promise<FsFile> {
  const fd = await openAsync(filePath, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_TRUNC);
  return new FsFile(fd);
}

function openOptionsToFlags(options: OpenOptions): number {
  let flags = options.read && options.write
    ? fs.constants.O_RDWR
    : options.write
    ? fs.constants.O_WRONLY
    : fs.constants.O_RDONLY;
  if (options.create) flags |= fs.constants.O_CREAT;
  if (options.truncate) flags |= fs.constants.O_TRUNC;
  if (options.append) flags |= fs.constants.O_APPEND;
  return flags;
}

/**
 * Writes the entire buffer synchronously, retrying on EAGAIN/EWOULDBLOCK
 * and handling partial writes. `fs.writeSync` can surface these on
 * non-blocking pipes (e.g. inherited from a spawned child).
 */
export function writeSyncAll(fd: number, data: Uint8Array): number {
  let offset = 0;
  while (offset < data.length) {
    try {
      const n = fs.writeSync(fd, data, offset, data.length - offset);
      if (n <= 0) break;
      offset += n;
    } catch (err: any) {
      if (err?.code === "EAGAIN" || err?.code === "EWOULDBLOCK") continue;
      throw err;
    }
  }
  return offset;
}

/** Async equivalent of {@link writeSyncAll}. */
export async function writeAll(fd: number, data: Uint8Array): Promise<number> {
  let offset = 0;
  while (offset < data.length) {
    const n = await writeOnce(fd, data, offset);
    if (n <= 0) break;
    offset += n;
  }
  return offset;
}

function writeOnce(fd: number, data: Uint8Array, offset: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const attempt = () => {
      fs.write(fd, data, offset, data.length - offset, null, (err, bytesWritten) => {
        if (err) {
          // re-queue on non-blocking-pipe signals so we yield to the event loop instead of spinning
          if (err.code === "EAGAIN" || err.code === "EWOULDBLOCK") setImmediate(attempt);
          else reject(err);
        } else {
          resolve(bytesWritten);
        }
      });
    };
    attempt();
  });
}
