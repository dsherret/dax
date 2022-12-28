import { getIfInstantiated, instantiateWithCaching, WasmInstance } from "../lib/mod.ts";
import { logger, LoggerRefreshItemKind } from "./logger.ts";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

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
  const { strip_ansi_codes } = await instantiateWithCaching();
  while (true) {
    const buf = new Uint8Array(8);
    const byteCount = await Deno.read(Deno.stdin.rid, buf);
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
    const text = strip_ansi_codes(decoder.decode(buf.slice(0, byteCount ?? 0)));
    if (text.length > 0) {
      yield text;
    }
  }
}

export function hideCursor() {
  Deno.stderr.writeSync(encoder.encode("\x1B[?25l"));
}

export function showCursor() {
  Deno.stderr.writeSync(encoder.encode("\x1B[?25h"));
}

export function ensureTty(title: string) {
  if (!Deno.isatty(Deno.stdin.rid)) {
    throw new Error(`Cannot prompt when not a tty. (Prompt: '${title}')`);
  }
}

export const isInteractiveConsole = Deno.isatty(Deno.stdin.rid) && safeConsoleSize() != null;

export function resultOrExit<T>(result: T | undefined): T {
  if (result == null) {
    Deno.exit(130);
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
  ensureTty(options.message);
  if (safeConsoleSize() == null) {
    throw new Error(`Cannot prompt when can't get console size. (Prompt: '${options.message}')`);
  }
  return ensureSingleSelection(async () => {
    await logger.setItems(LoggerRefreshItemKind.Selection, options.render());

    for await (const key of readKeys()) {
      const keyResult = options.onKey(key);
      if (keyResult != null) {
        const size = Deno.consoleSize();
        await logger.setItems(LoggerRefreshItemKind.Selection, [], size);
        if (options.noClear) {
          await logger.logOnce(options.render(), size);
        }
        return keyResult;
      }
      await logger.setItems(LoggerRefreshItemKind.Selection, options.render());
    }

    await logger.setItems(LoggerRefreshItemKind.Selection, []); // clear
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
      Deno.stdin.setRaw(true);
      try {
        return await action();
      } finally {
        Deno.stdin.setRaw(false);
      }
    } finally {
      showCursor();
    }
  })();
  lastPromise = currentPromise;
  return currentPromise;
}

export type TextItem = string | HangingTextItem;

export interface HangingTextItem {
  text: string;
  indent: number;
}

export interface ConsoleSize {
  columns: number;
  rows: number;
}

export function safeConsoleSize(): ConsoleSize | undefined {
  try {
    return Deno.consoleSize();
  } catch {
    return undefined;
  }
}

export async function getStaticText() {
  const instance = await instantiateWithCaching();
  return createStaticTextFromInstance(instance);
}

export function getStaticTextIfCreated() {
  const instance = getIfInstantiated();
  return instance == null ? undefined : createStaticTextFromInstance(instance);
}

function createStaticTextFromInstance(instance: WasmInstance) {
  return {
    set(items: TextItem[], size?: ConsoleSize) {
      if (items.length === 0) {
        return this.clear(size);
      }

      const { columns, rows } = size ?? Deno.consoleSize();
      const newText = instance.static_text_render_text(items, columns, rows);
      if (newText != null) {
        Deno.stderr.writeSync(encoder.encode(newText));
      }
    },
    outputItems(items: TextItem[], size?: ConsoleSize) {
      const { columns, rows } = size ?? Deno.consoleSize();
      const newText = instance.static_text_render_once(items, columns, rows);
      if (newText != null) {
        Deno.stderr.writeSync(encoder.encode(newText + "\n"));
      }
    },
    clear(size?: ConsoleSize) {
      const { columns, rows } = size ?? Deno.consoleSize();
      const newText = instance.static_text_clear_text(columns, rows);
      if (newText != null) {
        Deno.stderr.writeSync(encoder.encode(newText));
      }
    },
  };
}
