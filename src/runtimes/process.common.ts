import { ShellPipeWriter } from "../pipes.ts";

export interface SpawnCommandOptions {
  args: string[];
  cwd: string;
  env: Record<string, string>;
  clearEnv: boolean;
  stdin: "inherit" | "null" | "piped";
  stdout: "inherit" | "null" | "piped";
  stderr: "inherit" | "null" | "piped";
}

export interface SpawnedChildProcess {
  getWritableStdin(): WritableStream;
  pipeStdoutTo(writer: ShellPipeWriter, signal: AbortSignal): Promise<void>;
  pipeStderrTo(writer: ShellPipeWriter, signal: AbortSignal): Promise<void>;
  kill(signo?: Deno.Signal): void;
  waitExitCode(): Promise<number>;
}

export type SpawnCommand = (path: string, options: SpawnCommandOptions) => SpawnedChildProcess;
