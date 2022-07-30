import { ExecuteResult } from "./result.ts";

export type CommandPipeReader = "inherit" | "null" | Deno.Reader;

export interface CommandPipeWriter extends Deno.Writer {
  write(p: Uint8Array): Promise<number>;
  writeText(text: string): Promise<void>;
  writeLine(text: string): Promise<void>;
}

export interface CommandContext {
  get args(): string[];
  get cwd(): string;
  get stdin(): CommandPipeReader;
  get stdout(): CommandPipeWriter;
  get stderr(): CommandPipeWriter;
}

export type CommandHandler = (context: CommandContext) => Promise<ExecuteResult>;
