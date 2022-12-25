import { Buffer, writeAllSync } from "./deps.ts";

const encoder = new TextEncoder();

export type ShellPipeReader = "inherit" | "null" | Deno.Reader;
/**
 * The behaviour to use for a shell pipe.
 * @value "inherit" - Sends the output directly to the current process' corresponding pipe (default).
 * @value "null" - Does not pipe or redirect the pipe.
 * @value "piped" - Captures the pipe without outputting.
 * @value "inheritPiped" - Captures the pipe with outputting.
 */
export type ShellPipeWriterKind = "inherit" | "null" | "piped" | "inheritPiped";

export class NullPipeWriter implements Deno.WriterSync {
  writeSync(p: Uint8Array): number {
    return p.length;
  }
}

export class ShellPipeWriter implements Deno.WriterSync {
  #kind: ShellPipeWriterKind;
  #inner: Deno.WriterSync;

  constructor(kind: ShellPipeWriterKind, inner: Deno.WriterSync) {
    this.#kind = kind;
    this.#inner = inner;
  }

  get kind() {
    return this.#kind;
  }

  writeSync(p: Uint8Array) {
    return this.#inner.writeSync(p);
  }

  writeText(text: string) {
    return writeAllSync(this, encoder.encode(text));
  }

  writeLine(text: string) {
    return this.writeText(text + "\n");
  }
}

export class CapturingBufferWriter implements Deno.WriterSync {
  #buffer: Buffer;
  #innerWriter: Deno.WriterSync;

  constructor(innerWriter: Deno.WriterSync, buffer: Buffer) {
    this.#innerWriter = innerWriter;
    this.#buffer = buffer;
  }

  getBuffer() {
    return this.#buffer;
  }

  writeSync(p: Uint8Array) {
    const nWritten = this.#innerWriter.writeSync(p);
    this.#buffer.writeSync(p.slice(0, nWritten));
    return nWritten;
  }
}
