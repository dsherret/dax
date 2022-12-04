import { path } from "./deps.ts";

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

export async function stat(path: string, test: (info: Deno.FileInfo) => boolean) {
  try {
    const info = await Deno.lstat(path);
    return test(info);
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      return false;
    } else {
      throw err;
    }
  }
}
export async function isFile(path: string) {
  return await stat(path, (info) => info.isFile);
}
export async function isDir(path: string) {
  return await stat(path, (info) => info.isDirectory);
}
export async function isSymlink(path: string) {
  return await stat(path, (info) => info.isSymlink);
}
