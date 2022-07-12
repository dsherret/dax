import { writeAll } from "./deps.ts";

const encoder = new TextEncoder();

export type ShellPipeReader = "inherit" | "null" | Deno.Reader;
export type ShellPipeWriterKind = "inherit" | "null" | "pipe";

export class NullPipeWriter implements Deno.Writer {
  write(p: Uint8Array): Promise<number> {
    return Promise.resolve(p.length);
  }
}

export class ShellPipeWriter implements Deno.Writer {
  #kind: ShellPipeWriterKind;
  #inner: Deno.Writer;

  constructor(kind: ShellPipeWriterKind, inner: Deno.Writer) {
    this.#kind = kind;
    this.#inner = inner;
  }

  get kind() {
    return this.#kind;
  }

  write(p: Uint8Array): Promise<number> {
    return this.#inner.write(p);
  }

  async writeText(text: string) {
    return writeAll(this, encoder.encode(text));
  }

  async writeLine(text: string) {
    return this.writeText(text + "\n");
  }
}
