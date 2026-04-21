import * as cp from "node:child_process";
import { Readable, Writable } from "node:stream";
import { getSignalAbortCode } from "./command.ts";
import { isWindows } from "./common.ts";
import type { Signal } from "./signal.ts";

export interface SpawnCommandOptions {
  args: string[];
  cwd: string;
  /** The complete environment for the child — Node's `cp.spawn` does not
   * merge with `process.env` when this is passed. */
  env: Record<string, string>;
  stdin: "inherit" | "null" | "piped";
  stdout: "inherit" | "null" | "piped";
  stderr: "inherit" | "null" | "piped";
}

export interface SpawnedChildProcess {
  stdin(): WritableStream;
  stdout(): ReadableStream;
  stderr(): ReadableStream;
  kill(signo?: Signal): void;
  waitExitCode(): Promise<number>;
}

export function spawnCommand(path: string, options: SpawnCommandOptions): SpawnedChildProcess {
  let receivedSignal: Signal | undefined;
  // launching bat or cmd files in Node.js will error, so launch
  // via cmd.exe instead https://nodejs.org/en/blog/vulnerability/april-2024-security-releases-2
  const isWindowsBatch = isWindows && /\.(cmd|bat)$/i.test(path);
  const child = cp.spawn(
    isWindowsBatch ? "cmd.exe" : path,
    isWindowsBatch ? ["/d", "/s", "/c", path, ...options.args] : options.args,
    {
      cwd: options.cwd,
      env: options.env,
      stdio: [
        toNodeStdio(options.stdin),
        toNodeStdio(options.stdout),
        toNodeStdio(options.stderr),
      ],
    },
  );
  const exitResolvers = Promise.withResolvers<number>();
  child.on("exit", (code) => {
    if (code == null && receivedSignal != null) {
      exitResolvers.resolve(getSignalAbortCode(receivedSignal) ?? 1);
    } else {
      exitResolvers.resolve(code ?? 0);
    }
  });
  child.on("error", (err) => {
    exitResolvers.reject(err);
  });
  return {
    stdin() {
      return Writable.toWeb(child.stdin!);
    },
    kill(signo?: Signal) {
      receivedSignal = signo;
      child.kill(signo as any);
    },
    waitExitCode() {
      return exitResolvers.promise;
    },
    stdout() {
      return Readable.toWeb(child.stdout!) as ReadableStream;
    },
    stderr() {
      return Readable.toWeb(child.stderr!) as ReadableStream;
    },
  };
}

function toNodeStdio(stdio: "inherit" | "null" | "piped") {
  switch (stdio) {
    case "inherit":
      return "inherit";
    case "null":
      return "ignore";
    case "piped":
      return "pipe";
  }
}
