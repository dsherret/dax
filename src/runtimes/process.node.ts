import * as cp from "node:child_process";
import * as os from "node:os";
import { Readable, Writable } from "node:stream";
import { getSignalAbortCode } from "../command.ts";
import type { SpawnCommand } from "./process.common.ts";

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

export const spawnCommand: SpawnCommand = (path, options) => {
  let receivedSignal: Deno.Signal | undefined;
  // launching bat or cmd files in Node.js will error, so launch
  // via cmd.exe instead https://nodejs.org/en/blog/vulnerability/april-2024-security-releases-2
  const isWindowsBatch = os.platform() === "win32" && /\.(cmd|bat)$/i.test(path);
  const child = cp.spawn(
    isWindowsBatch ? "cmd.exe" : path,
    isWindowsBatch ? ["/d", "/s", "/c", path, ...options.args] : options.args,
    {
      cwd: options.cwd,
      // todo: clearEnv on node?
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
    kill(signo?: Deno.Signal) {
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
};
