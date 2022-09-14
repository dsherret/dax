import { ExecuteResult } from "./result.ts";

export type CommandPipeReader = "inherit" | "null" | Deno.Reader;

export interface CommandPipeWriter extends Deno.WriterSync {
  writeSync(p: Uint8Array): number;
  writeText(text: string): void;
  writeLine(text: string): void;
}

export interface CommandContext {
  get args(): string[];
  get cwd(): string;
  get stdin(): CommandPipeReader;
  get stdout(): CommandPipeWriter;
  get stderr(): CommandPipeWriter;
}

export type CommandHandler = (context: CommandContext) => Promise<ExecuteResult>;
