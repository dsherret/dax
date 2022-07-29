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

// TODO remove this once https://github.com/dsherret/dax/pull/5 is merged
export function resolvePath(cwd: string, arg: string) {
  return path.resolve(path.isAbsolute(arg) ? arg : path.join(cwd, arg));
}
