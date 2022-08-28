import { Buffer, writeAll } from "./deps.ts";

const encoder = new TextEncoder();

export type ShellPipeReader = "inherit" | "null" | Deno.Reader;
/**
 * The behaviour to use for a shell pipe.
 * @value "inherit" - Sends the output directly to the current process' corresponding pipe (default).
 * @value "null" - Does not pipe or redirect the pipe.
 * @value "piped" - Captures the pipe without outputting.
 * @value "captured" - Captures the pipe with outputting.
 */
export type ShellPipeWriterKind = "inherit" | "null" | "piped" | "captured";

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

export class CapturingBufferWriter implements Deno.Writer {
  #buffer: Buffer;
  #innerWriter: Deno.Writer;

  constructor(innerWriter: Deno.Writer, buffer: Buffer) {
    this.#innerWriter = innerWriter;
    this.#buffer = buffer;
  }

  getBuffer() {
    return this.#buffer;
  }

  async write(p: Uint8Array): Promise<number> {
    const nWritten = await this.#innerWriter.write(p);
    // sync is ok because Buffer is sync
    this.#buffer.writeSync(p.slice(0, nWritten));
    return nWritten;
  }
}
