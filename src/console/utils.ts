import { logger, LoggerRefreshItemKind } from "./logger.ts";
import { maybeConsoleSize, stripAnsiCodes, type TextItem } from "@david/console-static-text";
import * as compat from "../compat.ts";

const encoder = new TextEncoder();

export enum Keys {
  Up,
  Down,
  Left,
  Right,
  Enter,
  Space,
  Backspace,
}

export async function* readKeys() {
  return yield* innerReadKeys(compat.stdin);
}

export async function* innerReadKeys(reader: Pick<typeof compat.stdin, "read">) {
  // A new decoder is always needed to take into account that UTF-8 sequences are read in pieces.
  const decoder = new TextDecoder();

  while (true) {
    const buf = new Uint8Array(8);
    const byteCount = await reader.read(buf);
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
  compat.stderr.writeSync(encoder.encode("\x1B[?25l"));
}

export function showCursor() {
  compat.stderr.writeSync(encoder.encode("\x1B[?25h"));
}

export let isOutputTty = maybeConsoleSize() != null && isTerminal(compat.stderr);

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
    compat.exit(130);
  } else {
    return result;
  }
}

export interface SelectionOptions<TReturn> {
  message: string;
  render: () => TextItem[];
  noClear: boolean | undefined;
  onKey: (key: string | Keys) => TReturn | undefined;
}

export function createSelection<TReturn>(options: SelectionOptions<TReturn>): Promise<TReturn | undefined> {
  if (!isOutputTty || !isTerminal(compat.stdin)) {
    throw new Error(`Cannot prompt when not a tty. (Prompt: '${options.message}')`);
  }
  if (maybeConsoleSize() == null) {
    throw new Error(`Cannot prompt when can't get console size. (Prompt: '${options.message}')`);
  }
  return ensureSingleSelection(async () => {
    logger.setItems(LoggerRefreshItemKind.Selection, options.render());

    for await (const key of readKeys()) {
      const keyResult = options.onKey(key);
      if (keyResult != null) {
        const size = compat.consoleSize();
        logger.setItems(LoggerRefreshItemKind.Selection, [], size);
        if (options.noClear) {
          logger.logOnce(options.render(), size);
        }
        return keyResult;
      }
      logger.setItems(LoggerRefreshItemKind.Selection, options.render());
    }

    logger.setItems(LoggerRefreshItemKind.Selection, []); // clear
    return undefined;
  });
}

let lastPromise: Promise<any> = Promise.resolve();
function ensureSingleSelection<TReturn>(action: () => Promise<TReturn>) {
  const currentLastPromise = lastPromise;
  const currentPromise = (async () => {
    try {
      await currentLastPromise;
    } catch {
      // ignore
    }
    hideCursor();
    try {
      compat.stdin.setRaw(true);
      try {
        return await action();
      } finally {
        compat.stdin.setRaw(false);
      }
    } finally {
      showCursor();
    }
  })();
  lastPromise = currentPromise;
  return currentPromise;
}
