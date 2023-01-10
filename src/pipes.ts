import { logger } from "./console/logger.ts";
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

const lineFeedCharCode = "\n".charCodeAt(0);

export class InheritStaticTextBypassWriter implements Deno.WriterSync {
  #buffer: Buffer;
  #innerWriter: Deno.WriterSync;

  constructor(innerWriter: Deno.WriterSync) {
    this.#innerWriter = innerWriter;
    this.#buffer = new Buffer();
  }

  writeSync(p: Uint8Array): number {
    // line buffer the output so that we don't conflict with the progress bars
    const index = p.findLastIndex((v) => v === lineFeedCharCode);
    if (index === -1) {
      this.#buffer.writeSync(p);
    } else {
      // todo: seems inefficient
      this.#buffer.writeSync(p.slice(0, index + 1));
      this.flush();
      this.#buffer.writeSync(p.slice(index + 1));
    }
    return p.byteLength;
  }

  flush() {
    const bytes = this.#buffer.bytes({ copy: false });
    logger.logAboveStaticText(() => {
      writeAllSync(this.#innerWriter, bytes);
    });
    this.#buffer.reset();
  }
}

export interface PipedBufferListener extends Deno.WriterSync, Deno.Closer {
  setError(err: Error): void;
}

export class PipedBuffer implements Deno.WriterSync {
  #inner: Buffer | PipedBufferListener;
  #hasSet = false;

  constructor() {
    this.#inner = new Buffer();
  }

  getBuffer() {
    if (this.#inner instanceof Buffer) {
      return this.#inner;
    } else {
      return undefined;
    }
  }

  setError(err: Error) {
    if ("setError" in this.#inner) {
      this.#inner.setError(err);
    }
  }

  close() {
    if ("close" in this.#inner) {
      this.#inner.close();
    }
  }

  writeSync(p: Uint8Array) {
    return this.#inner.writeSync(p);
  }

  setListener(listener: PipedBufferListener) {
    if (this.#hasSet) {
      throw new Error("Piping to multiple outputs is currently not supported.");
    }

    if (this.#inner instanceof Buffer) {
      writeAllSync(listener, this.#inner.bytes({ copy: false }));
    }

    this.#inner = listener;
    this.#hasSet = true;
  }
}
