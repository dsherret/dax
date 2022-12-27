import { getIfInstantiated, instantiateWithCaching, WasmInstance } from "../lib/mod.ts";

const encoder = new TextEncoder();

export enum Keys {
  Up,
  Down,
  Left,
  Right,
  Enter,
  Space,
}

export async function* readKeys() {
  while (true) {
    const buf = new Uint8Array(16);
    const byteCount = await Deno.read(Deno.stdin.rid, buf);
    if (byteCount === 3) {
      if (buf[0] === 27 && buf[1] === 91) {
        if (buf[2] === 65) {
          yield Keys.Up;
        } else if (buf[2] === 66) {
          yield Keys.Down;
        } else if (buf[2] === 67) {
          yield Keys.Right;
        } else if (buf[2] === 68) {
          yield Keys.Left;
        }
      }
    } else if (byteCount === 1) {
      if (buf[0] === 3) {
        // ctrl+c
        break;
      } else if (buf[0] === 13) {
        yield Keys.Enter;
      } else if (buf[0] === 32) {
        yield Keys.Space;
      }
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

let lastPromise: Promise<any> = Promise.resolve();
export function ensureSingleSelection<TReturn>(action: () => Promise<TReturn>) {
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
    clear(size?: ConsoleSize) {
      const { columns, rows } = size ?? Deno.consoleSize();
      const newText = instance.static_text_clear_text(columns, rows);
      if (newText != null) {
        Deno.stderr.writeSync(encoder.encode(newText));
      }
    },
  };
}
