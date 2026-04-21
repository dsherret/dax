import * as fs from "node:fs";
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
    return Promise.resolve(writeSyncAll(this.#fd, p));
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
    const fd = this.#fd;
    return new WritableStream({
      write(chunk) {
        writeSyncAll(fd, chunk);
      },
    });
  }

  [Symbol.dispose](): void {
    this.close();
  }
}

export async function open(filePath: string, options: OpenOptions): Promise<FsFile> {
  const flags = openOptionsToFlags(options);
  const fd = await openAsync(filePath, flags);
  return new FsFile(fd);
}

export async function create(filePath: string): Promise<FsFile> {
  const fd = await openAsync(filePath, "w");
  return new FsFile(fd);
}

function openOptionsToFlags(options: OpenOptions): string {
  if (options.write && options.append) return "a";
  if (options.write && options.create) return "w";
  if (options.write) return "r+";
  return "r";
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
