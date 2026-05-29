import * as fs from "node:fs";
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
}

// undefined = not yet attempted; null = attempted and failed
let cached: OpenedTty | null | undefined;

function tryOpen(): OpenedTty | null {
  if (cached !== undefined) return cached;
  try {
    const path = process.platform === "win32" ? "\\\\.\\CONIN$" : "/dev/tty";
    // r+ rather than r — setRawMode needs the fd to support tcsetattr,
    // and on some platforms that's only granted when opened for writing too.
    const fd = fs.openSync(path, "r+");
    const stream = new tty.ReadStream(fd);
    cached = { fd, stream };
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
  read(p: Uint8Array, options?: { signal?: AbortSignal }): Promise<number | null> {
    const signal = options?.signal;
    signal?.throwIfAborted();
    const handle = tryOpen();
    if (handle == null) return Promise.reject(new Error("No controlling terminal available."));
    return readTty(handle.stream, p, signal);
  },
  setRaw(mode: boolean): void {
    const handle = tryOpen();
    if (handle == null) return;
    handle.stream.setRawMode(mode);
  },
};

// reads directly from the tty.ReadStream in paused mode by listening for a
// single `readable` event and detaching afterwards. Same pattern @david/shell
// uses for stdin: leaves the stream in a clean, handoff-able state, and is
// cleanly abortable — aborting just removes the listener, with no read syscall
// left outstanding to steal a byte from the next reader.
function readTty(stream: tty.ReadStream, p: Uint8Array, signal?: AbortSignal): Promise<number | null> {
  return new Promise<number | null>((resolve, reject) => {
    const onReadable = () => {
      const chunk = stream.read() as Uint8Array | null;
      if (chunk === null) return; // nothing buffered yet; wait for the next event
      cleanup();
      const len = Math.min(chunk.length, p.length);
      p.set(chunk.subarray(0, len));
      // put any bytes we didn't consume back into the stream rather than a
      // private buffer, so the next reader still sees them.
      if (chunk.length > len) stream.unshift(chunk.subarray(len));
      resolve(len);
    };
    const onEnd = () => {
      cleanup();
      resolve(null);
    };
    const onError = (err: Error) => {
      cleanup();
      reject(err);
    };
    const onAbort = () => {
      cleanup();
      reject(signal!.reason);
    };
    const cleanup = () => {
      stream.off("readable", onReadable);
      stream.off("end", onEnd);
      stream.off("error", onError);
      signal?.removeEventListener("abort", onAbort);
    };

    stream.on("readable", onReadable);
    stream.on("end", onEnd);
    stream.on("error", onError);
    signal?.addEventListener("abort", onAbort, { once: true });
    // data may already be buffered, so attempt a read right away.
    onReadable();
  });
}
