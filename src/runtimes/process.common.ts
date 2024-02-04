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
  stdin(): WritableStream;
  stdout(): ReadableStream;
  stderr(): ReadableStream;
  kill(signo?: Deno.Signal): void;
  waitExitCode(): Promise<number>;
}

export type SpawnCommand = (path: string, options: SpawnCommandOptions) => SpawnedChildProcess;
