import { type Delay, delayToMs } from "@david/shell";

/** A timeout error. */
export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
  }

  override get name(): string {
    return "TimeoutError";
  }
}

/** An iterator that returns a new delay each time. */
export interface DelayIterator {
  next(): number;
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

export function formatMillis(ms: number): string {
  if (ms < 1000) {
    return `${formatValue(ms)} millisecond${ms === 1 ? "" : "s"}`;
  } else if (ms < 60 * 1000) {
    const s = ms / 1000;
    return `${formatValue(s)} ${pluralize("second", s)}`;
  } else {
    const mins = ms / 60 / 1000;
    return `${formatValue(mins)} ${pluralize("minute", mins)}`;
  }

  function formatValue(value: number) {
    const text = value.toFixed(2);
    if (text.endsWith(".00")) {
      return value.toFixed(0);
    } else if (text.endsWith("0")) {
      return value.toFixed(1);
    } else {
      return text;
    }
  }

  function pluralize(text: string, value: number) {
    const suffix = value === 1 ? "" : "s";
    return text + suffix;
  }
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

export function getFileNameFromUrl(url: string | URL): string | undefined {
  const parsedUrl = url instanceof URL ? url : new URL(url);
  const fileName = parsedUrl.pathname.split("/").at(-1);
  return fileName?.length === 0 ? undefined : fileName;
}
