import { type FsFileWrapper, PathRef } from "./path.ts";
import { logger } from "./console/logger.ts";
import { Buffer, writeAll, writeAllSync } from "./deps.ts";
import type { RequestBuilder } from "./request.ts";
import type { CommandBuilder } from "./command.ts";

const encoder = new TextEncoder();

/** `Deno.Reader` stream. */
export interface Reader {
  read(p: Uint8Array): Promise<number | null>;
}

/** `Deno.ReaderSync` stream. */
export interface ReaderSync {
  readSync(p: Uint8Array): number | null;
}

/** `Deno.WriterSync` stream. */
export interface WriterSync {
  writeSync(p: Uint8Array): number;
}

/** `Deno.Writer` stream. */
export interface Writer {
  write(p: Uint8Array): Promise<number>;
}

export type PipeReader = Reader | ReaderSync;

export type PipeWriter = Writer | WriterSync;

/** `Deno.Closer` */
export interface Closer {
  close(): void;
}

/** Behaviour to use for stdin.
 * @value "inherit" - Sends the stdin of the process to the shell (default).
 * @value "null" - Does not pipe or redirect the pipe.
 */
export type ShellPipeReaderKind =
  | "inherit"
  | "null"
  | Reader
  | ReadableStream<Uint8Array>
  | Uint8Array
  | CommandBuilder
  | FsFileWrapper
  | PathRef
  | RequestBuilder;
/**
 * The behaviour to use for a shell pipe.
 * @value "inherit" - Sends the output directly to the current process' corresponding pipe (default).
 * @value "null" - Does not pipe or redirect the pipe.
 * @value "piped" - Captures the pipe without outputting.
 * @value "inheritPiped" - Captures the pipe with outputting.
 */
export type ShellPipeWriterKind =
  | "inherit"
  | "null"
  | "piped"
  | "inheritPiped"
  | WriterSync
  | WritableStream<Uint8Array>
  | FsFileWrapper
  | PathRef;

export class NullPipeWriter implements WriterSync {
  writeSync(p: Uint8Array): number {
    return p.length;
  }
}

export class ShellPipeWriter {
  #kind: ShellPipeWriterKind;
  #inner: PipeWriter;

  constructor(kind: ShellPipeWriterKind, inner: PipeWriter) {
    this.#kind = kind;
    this.#inner = inner;
  }

  get kind() {
    return this.#kind;
  }

  write(p: Uint8Array) {
    if ("write" in this.#inner) {
      return this.#inner.write(p);
    } else {
      return this.#inner.writeSync(p);
    }
  }

  writeAll(data: Uint8Array) {
    if ("write" in this.#inner) {
      return writeAll(this.#inner, data);
    } else {
      return writeAllSync(this.#inner, data);
    }
  }

  writeText(text: string) {
    return this.writeAll(encoder.encode(text));
  }

  writeLine(text: string) {
    return this.writeText(text + "\n");
  }
}

export class CapturingBufferWriter implements WriterSync {
  #buffer: Buffer;
  #innerWriter: WriterSync;

  constructor(innerWriter: WriterSync, buffer: Buffer) {
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

export class InheritStaticTextBypassWriter implements WriterSync {
  #buffer: Buffer;
  #innerWriter: WriterSync;

  constructor(innerWriter: WriterSync) {
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

export interface PipedBufferListener extends WriterSync, Closer {
  setError(err: Error): void;
}

export class PipedBuffer implements WriterSync {
  #inner: Buffer | PipedBufferListener;
  #hasSet = false;

  constructor() {
    this.#inner = new Buffer();
  }

  getBuffer(): Buffer | undefined {
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

  writeSync(p: Uint8Array): number {
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

export class PipeSequencePipe implements Reader, WriterSync {
  #inner = new Buffer();
  #readListener: (() => void) | undefined;
  #closed = false;

  close() {
    this.#readListener?.();
    this.#closed = true;
  }

  writeSync(p: Uint8Array): number {
    const value = this.#inner.writeSync(p);
    if (this.#readListener !== undefined) {
      const listener = this.#readListener;
      this.#readListener = undefined;
      listener();
    }
    return value;
  }

  read(p: Uint8Array): Promise<number | null> {
    if (this.#readListener !== undefined) {
      // doesn't support multiple read listeners at the moment
      throw new Error("Misuse of PipeSequencePipe");
    }

    if (this.#inner.length === 0) {
      if (this.#closed) {
        return Promise.resolve(null);
      } else {
        return new Promise((resolve) => {
          this.#readListener = () => {
            resolve(this.#inner.readSync(p));
          };
        });
      }
    } else {
      return Promise.resolve(this.#inner.readSync(p));
    }
  }
}
