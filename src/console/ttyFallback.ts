import * as fs from "node:fs";
import { Readable } from "node:stream";
import * as tty from "node:tty";
import process from "node:process";

/** A stdin-shaped handle backed by `/dev/tty` (Unix) or `\\.\CONIN$`
 * (Windows), so prompts can read keystrokes from the controlling
 * terminal even when the process's stdin is a pipe.
 *
 * Mirrors fzf / vim / `git commit`'s behavior of bypassing stdin and
 * reading the user's actual terminal directly. */
export interface TtyStdin {
  read(p: Uint8Array, options?: { signal?: AbortSignal }): Promise<number | null>;
  setRaw(mode: boolean): void;
}

interface OpenedTty {
  fd: number;
  stream: tty.ReadStream;
  reader: ReadableStreamDefaultReader<Uint8Array>;
}

// undefined = not yet attempted; null = attempted and failed
let cached: OpenedTty | null | undefined;
let pendingTtyRead: Promise<ReadableStreamReadResult<Uint8Array>> | undefined;
let ttyLeftover: Uint8Array | undefined;

function tryOpen(): OpenedTty | null {
  if (cached !== undefined) return cached;
  try {
    const path = process.platform === "win32" ? "\\\\.\\CONIN$" : "/dev/tty";
    // r+ rather than r — setRawMode needs the fd to support tcsetattr,
    // and on some platforms that's only granted when opened for writing too.
    const fd = fs.openSync(path, "r+");
    const stream = new tty.ReadStream(fd);
    // wrapping the stream locks it to one consumer; cache so an aborted
    // read doesn't lose bytes — the in-flight read and leftover buffer
    // are tied to this reader, same pattern as @david/shell's stdin.
    const readable = Readable.toWeb(stream) as ReadableStream<Uint8Array>;
    const reader = readable.getReader();
    cached = { fd, stream, reader };
  } catch {
    cached = null;
  }
  return cached;
}

/** Whether a controlling terminal is reachable via `/dev/tty` / `CONIN$`. */
export function hasFallbackTty(): boolean {
  return tryOpen() != null;
}

/** Lazily-opened stdin bound to the controlling terminal. Throws on
 * use if no controlling terminal is available — guard with
 * {@link hasFallbackTty} first. */
export const ttyStdin: TtyStdin = {
  async read(p: Uint8Array, options?: { signal?: AbortSignal }): Promise<number | null> {
    const signal = options?.signal;
    signal?.throwIfAborted();
    const handle = tryOpen();
    if (handle == null) throw new Error("No controlling terminal available.");

    if (ttyLeftover === undefined) {
      // share a single in-flight read across callers so an aborted read
      // doesn't drop bytes — the next call awaits the same promise.
      pendingTtyRead ??= handle.reader.read();
      const result = await (signal ? raceAbort(pendingTtyRead, signal) : pendingTtyRead);
      pendingTtyRead = undefined;
      if (result.done || result.value === undefined) return null;
      ttyLeftover = result.value;
    }

    const len = Math.min(ttyLeftover.length, p.length);
    p.set(ttyLeftover.subarray(0, len));
    ttyLeftover = ttyLeftover.length > len ? ttyLeftover.subarray(len) : undefined;
    return len;
  },
  setRaw(mode: boolean): void {
    const handle = tryOpen();
    if (handle == null) return;
    handle.stream.setRawMode(mode);
  },
};

function raceAbort<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(signal.reason);
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (v) => {
        signal.removeEventListener("abort", onAbort);
        resolve(v);
      },
      (e) => {
        signal.removeEventListener("abort", onAbort);
        reject(e);
      },
    );
  });
}
