import { logger, LoggerRefreshItemKind } from "./logger.ts";
import { maybeConsoleSize, stripAnsiCodes, type TextItem } from "@david/console-static-text";
import { stderr, stdin } from "@david/shell";
import { hasFallbackTty, ttyStdin } from "./ttyFallback.ts";

const encoder = new TextEncoder();

/** Input source for an interactive prompt — either the process's stdin
 * or a fallback handle on `/dev/tty` / `CONIN$` when stdin is piped. */
type PromptInput = Pick<typeof stdin, "read" | "setRaw">;

function resolvePromptInput(): PromptInput | undefined {
  if (isTerminal(stdin)) return stdin;
  if (hasFallbackTty()) return ttyStdin;
  return undefined;
}

export enum Keys {
  Up,
  Down,
  Left,
  Right,
  Enter,
  Space,
  Backspace,
}

export async function* readKeys(reader: PromptInput, signal: AbortSignal | undefined) {
  return yield* innerReadKeys(reader, signal);
}

export async function* innerReadKeys(reader: Pick<typeof stdin, "read">, signal: AbortSignal | undefined) {
  // A new decoder is always needed to take into account that UTF-8 sequences are read in pieces.
  const decoder = new TextDecoder();

  while (true) {
    const buf = new Uint8Array(8);
    const byteCount = await reader.read(buf, { signal });
    if (byteCount == null) {
      break;
    }
    if (byteCount === 3) {
      if (buf[0] === 27 && buf[1] === 91) {
        if (buf[2] === 65) {
          yield Keys.Up;
          continue;
        } else if (buf[2] === 66) {
          yield Keys.Down;
          continue;
        } else if (buf[2] === 67) {
          yield Keys.Right;
          continue;
        } else if (buf[2] === 68) {
          yield Keys.Left;
          continue;
        }
      }
    } else if (byteCount === 1) {
      if (buf[0] === 3) {
        // ctrl+c
        break;
      } else if (buf[0] === 13) {
        yield Keys.Enter;
        continue;
      } else if (buf[0] === 14) {
        // ctrl+n
        yield Keys.Down;
        continue;
      } else if (buf[0] === 16) {
        // ctrl+p
        yield Keys.Up;
        continue;
      } else if (buf[0] === 32) {
        yield Keys.Space;
        continue;
      } else if (buf[0] === 127) {
        yield Keys.Backspace;
        continue;
      }
    }
    // stream: true preserves the remaining bytes that the decoder did not interpret as characters.
    // This is important because we want to handle multibyte characters correctly.
    const text = stripAnsiCodes(decoder.decode(buf.slice(0, byteCount ?? 0), { stream: true }));
    if (text.length > 0) {
      yield text;
    }
  }
}

export function hideCursor() {
  stderr.writeSync(encoder.encode("\x1B[?25l"));
}

export function showCursor() {
  stderr.writeSync(encoder.encode("\x1B[?25h"));
}

export let isOutputTty = maybeConsoleSize() != null && isTerminal(stderr);

export function setNotTtyForTesting() {
  isOutputTty = false;
}

function isTerminal(pipe: { isTerminal?(): boolean }) {
  if (typeof pipe.isTerminal === "function") {
    return pipe.isTerminal();
  } else {
    throw new Error("Unsupported pipe.");
  }
}

export function resultOrExit<T>(result: T | undefined): T {
  if (result == null) {
    process.exit(130);
  } else {
    return result;
  }
}

/** For `maybe*` variants: convert an abort rejection into `undefined`, so
 * a cancelled signal looks the same to callers as a ctrl+c. Callers that
 * need to distinguish can check `signal.aborted`. */
export function undefinedOnAbort<T>(
  signal: AbortSignal | undefined,
  p: Promise<T>,
): Promise<T | undefined> {
  if (signal == null) return p;
  return p.catch((err) => {
    if (signal.aborted && err === signal.reason) return undefined;
    throw err;
  });
}

/**
 * Result of a selection prompt. Coerces to its `index` so it can be used
 * directly as an array index for backwards compatibility.
 */
export class SelectionItem {
  readonly index: number;
  readonly value: string;

  constructor(index: number, value: string) {
    this.index = index;
    this.value = value;
  }

  [Symbol.toPrimitive](hint: string): number | string {
    return hint === "string" ? String(this.index) : this.index;
  }

  toString(): string {
    return String(this.index);
  }

  valueOf(): number {
    return this.index;
  }
}

export interface SelectionOptions<TReturn> {
  message: string;
  render: () => TextItem[];
  noClear: boolean | undefined;
  /**
   * Signal that cancels the prompt. When aborted, the returned promise
   * rejects with `signal.reason`. The `maybe*` variants convert this
   * rejection into a resolved `undefined`.
   */
  signal?: AbortSignal;
  onKey: (key: string | Keys) => TReturn | undefined;
}

export function createSelection<TReturn>(options: SelectionOptions<TReturn>): Promise<TReturn | undefined> {
  // stderr being a tty still gates prompts — that's where the UI is rendered.
  // for stdin we fall back to /dev/tty (or CONIN$ on Windows) when the
  // process's stdin is a pipe, so prompts work in `cmd | script.ts`.
  const input = isOutputTty ? resolvePromptInput() : undefined;
  if (input == null) {
    throw new Error(`Cannot prompt when not a tty. (Prompt: '${options.message}')`);
  }
  if (maybeConsoleSize() == null) {
    throw new Error(`Cannot prompt when can't get console size. (Prompt: '${options.message}')`);
  }
  const { signal } = options;
  if (signal?.aborted) {
    return Promise.reject(signal.reason);
  }
  return ensureSingleSelection(input, async () => {
    logger.setItems(LoggerRefreshItemKind.Selection, options.render());

    try {
      for await (const key of readKeys(input, signal)) {
        const keyResult = options.onKey(key);
        if (keyResult != null) return keyResult;
        logger.setItems(LoggerRefreshItemKind.Selection, options.render());
      }
      return undefined;
    } finally {
      // clear the live area and, when noClear is set, also commit the
      // final render to scrollback. doing this in finally makes the abort
      // path behave like the success path so subsequent output isn't
      // overwritten by the next refresh.
      const size = {
        columns: process.stdout.columns ?? 80,
        rows: process.stdout.rows ?? 24,
      };
      logger.setItems(LoggerRefreshItemKind.Selection, [], size);
      if (options.noClear) {
        logger.logOnce(options.render(), size);
      }
    }
  });
}

let lastPromise: Promise<any> = Promise.resolve();
function ensureSingleSelection<TReturn>(input: PromptInput, action: () => Promise<TReturn>) {
  const currentLastPromise = lastPromise;
  const currentPromise = (async () => {
    try {
      await currentLastPromise;
    } catch {
      // ignore
    }
    hideCursor();
    try {
      input.setRaw(true);
      try {
        return await action();
      } finally {
        input.setRaw(false);
      }
    } finally {
      showCursor();
    }
  })();
  lastPromise = currentPromise;
  return currentPromise;
}
