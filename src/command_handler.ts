import { ExecuteResult } from "./result.ts";

/** Used to read from stdin. */
export type CommandPipeReader = "inherit" | "null" | Deno.Reader;

/// Pipe everything to the specified writer
//FIXME CommandPipeWriter instead of Deno.WriterSync ?
export function pipeTo(reader: CommandPipeReader, writer: Deno.WriterSync) {
  // don't bother flushing here because this won't ever be called
  // with a Rust wrapped stdout/stderr
  pipeToInner(reader, writer, false);
}
export async function pipeToInner(reader: CommandPipeReader, writer: Deno.WriterSync, flush: boolean) {
  if (reader === "inherit" || reader === "null") throw "unimplemented";
  while (true) {
    const buffer = new Uint8Array(512);
    const size = await reader.read(buffer);
    if (size === 0) break;
    while (true) {
      //FIXME write(buffer[0..size])
      if (writer.writeSync(buffer) === 0) break;
    }
    //FIXME if (flush) writer.flush()
  }
}

/** Used to write to stdout or stderr. */
export interface CommandPipeWriter extends Deno.WriterSync {
  writeSync(p: Uint8Array): number;
  writeText(text: string): void;
  writeLine(text: string): void;
}

/** Context of the currently executing command. */
export interface CommandContext {
  get args(): string[];
  get cwd(): string;
  get stdin(): CommandPipeReader;
  get stdout(): CommandPipeWriter;
  get stderr(): CommandPipeWriter;
}

/** Handler for executing a command. */
export type CommandHandler = (context: CommandContext) => Promise<ExecuteResult> | ExecuteResult;
