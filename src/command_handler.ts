import type { KillSignal } from "./command.ts";
import type { Reader, ShellPipeWriterKind } from "./pipes.ts";
import type { ExecuteResult } from "./result.ts";
import type { ShellOptionsState } from "./shell.ts";

/** Used to read from stdin. */
export type CommandPipeReader = "inherit" | "null" | Reader;

/** Used to write to stdout or stderr. */
export interface CommandPipeWriter {
  kind: ShellPipeWriterKind;
  write(p: Uint8Array): Promise<number> | number;
  writeAll(p: Uint8Array): Promise<void> | void;
  writeText(text: string): Promise<void> | void;
  writeLine(text: string): Promise<void> | void;
}

/** Context of the currently executing command. */
export interface CommandContext {
  get args(): string[];
  get cwd(): string;
  get env(): Record<string, string>;
  get stdin(): CommandPipeReader;
  get stdout(): CommandPipeWriter;
  get stderr(): CommandPipeWriter;
  get signal(): KillSignal;
  /** Current shell options (nullglob, failglob, pipefail, globstar). */
  get shellOptions(): ShellOptionsState;
  /// Helper function for writing a line to stderr and returning a 1 exit code.
  error(message: string): Promise<ExecuteResult> | ExecuteResult;
  /// Helper function for writing a line to stderr and returning the provided exit code.
  error(code: number, message: string): Promise<ExecuteResult> | ExecuteResult;
}

/** Handler for executing a command. */
export type CommandHandler = (context: CommandContext) => Promise<ExecuteResult> | ExecuteResult;
