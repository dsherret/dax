import { logger } from "./console/mod.ts";
import { BufReader, path } from "./deps.ts";

/**
 * Delay used for certain actions.
 *
 * @remarks Providing just a number will use milliseconds.
 */
export type Delay = number | `${number}ms` | `${number}s`;

/** An iterator that returns a new delay each time. */
export interface DelayIterator {
  next(): number;
}

export function formatMillis(ms: number) {
  if (ms < 1000) {
    return `${ms} millisecond${ms === 1 ? "" : "s"}`;
  } else {
    const s = ms / 1000;
    return `${s} second${s === 1 ? "" : "s"}`;
  }
}

export function delayToIterator(delay: Delay | DelayIterator): DelayIterator {
  if (typeof delay !== "number" && typeof delay !== "string") {
    return delay;
  }
  const ms = delayToMs(delay);
  return {
    next() {
      return ms;
    },
  };
}

export function delayToMs(delay: Delay) {
  if (typeof delay === "number") {
    return delay;
  } else if (typeof delay === "string") {
    const msMatch = delay.match(/^([0-9]+)ms$/);
    if (msMatch != null) {
      return parseInt(msMatch[1], 10);
    }
    const secondsMatch = delay.match(/^([0-9]+\.?[0-9]*)s$/);
    if (secondsMatch != null) {
      return Math.round(parseFloat(secondsMatch[1]) * 1000);
    }
  }

  throw new Error(`Unknown delay value: ${delay}`);
}

export function filterEmptyRecordValues<TValue>(record: Record<string, TValue | undefined>): Record<string, TValue> {
  const result: Record<string, TValue> = {};
  for (const [key, value] of Object.entries(record)) {
    if (value != null) {
      result[key] = value;
    }
  }
  return result;
}

export function resolvePath(cwd: string, arg: string) {
  return path.resolve(path.isAbsolute(arg) ? arg : path.join(cwd, arg));
}

/**
 * Follow rust std::path::Path::join
 * The advantage is it can handle joining 2 absolute paths with common part

 * Rust: join("/a/b","/a/c") => "/a/b/c"
 * Deno. join("/a/b","/a/c") => "/a/b/a/c"
**/
export function rustJoin(path1: string, path2: string) {
  const maybeCommon = path.common([path1, path2]);
  if (!maybeCommon) return path.join(path1, path2);

  return path.join(maybeCommon, path1.replace(maybeCommon, ""), path2.replace(maybeCommon, ""));
}

export class Box<T> {
  constructor(public value: T) {
  }
}

export class TreeBox<T> {
  #value: T | TreeBox<T>;

  constructor(value: T | TreeBox<T>) {
    this.#value = value;
  }

  getValue() {
    let tree: TreeBox<T> = this;
    while (tree.#value instanceof TreeBox) {
      tree = tree.#value;
    }
    return tree.#value;
  }

  setValue(value: T) {
    this.#value = value;
  }

  createChild(): TreeBox<T> {
    return new TreeBox(this);
  }
}

/** A special kind of tree box that handles logging with static text. */
export class LoggerTreeBox extends TreeBox<(...args: any[]) => void> {
  getValue(): (...args: any[]) => void {
    const innerValue = super.getValue();
    return (...args: any[]) => {
      return logger.logAboveStaticText(() => {
        innerValue(...args);
      });
    };
  }
}

export async function lstat(path: string) {
  try {
    return await Deno.lstat(path);
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      return undefined;
    } else {
      throw err;
    }
  }
}

export function getFileNameFromUrl(url: string | URL) {
  const parsedUrl = url instanceof URL ? url : new URL(url);
  const fileName = parsedUrl.pathname.split("/").at(-1);
  return fileName?.length === 0 ? undefined : fileName;
}

/**
 * Gets an executable shebang from the provided file path.
 * @returns
 * - A string with the shebang.
 * - `undefined` if the file exists, but doesn't have a shebang.
 * - `false` if the file does NOT exist.
 */
export async function getExecutableShebangFromPath(path: string) {
  try {
    const file = await Deno.open(path, { read: true });
    try {
      return await getExecutableShebang(file);
    } finally {
      try {
        file.close();
      } catch {
        // ignore
      }
    }
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      return false;
    }
    throw err;
  }
}

const decoder = new TextDecoder();
export async function getExecutableShebang(reader: Deno.Reader) {
  const text = "#!/usr/bin/env -S ";
  const buffer = new Uint8Array(text.length);
  const bytesReadCount = await reader.read(buffer);
  if (bytesReadCount !== text.length || decoder.decode(buffer) !== text) {
    return undefined;
  }
  const bufReader = new BufReader(reader);
  const line = await bufReader.readLine();
  if (line == null) {
    return undefined;
  }
  return decoder.decode(line.line).trim();
}
