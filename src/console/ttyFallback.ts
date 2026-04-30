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
  read(p: Uint8Array): Promise<number | null>;
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
    // wrap once for setRawMode access. left in paused mode (the default)
    // so it doesn't pull bytes out from under fs.read on the same fd —
    // same pattern dax already relies on with process.stdin.
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
  read(p: Uint8Array): Promise<number | null> {
    return new Promise((resolve, reject) => {
      const handle = tryOpen();
      if (handle == null) {
        reject(new Error("No controlling terminal available."));
        return;
      }
      fs.read(handle.fd, p, 0, p.length, null, (err, bytesRead) => {
        if (err) reject(err);
        else resolve(bytesRead === 0 ? null : bytesRead);
      });
    });
  },
  setRaw(mode: boolean): void {
    const handle = tryOpen();
    if (handle == null) return;
    handle.stream.setRawMode(mode);
  },
};
