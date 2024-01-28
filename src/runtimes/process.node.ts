import * as cp from "node:child_process";
import { Reader, ShellPipeWriter } from "../pipes.ts";
import { SpawnCommand } from "./process.common.ts";
import { getSignalAbortCode } from "../command.ts";

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
  const child = cp.spawn(path, options.args, {
    cwd: options.cwd,
    // todo: clearEnv on node?
    env: options.env,
    stdio: [
      toNodeStdio(options.stdin),
      toNodeStdio(options.stdout),
      toNodeStdio(options.stderr),
    ],
  });
  const exitCode = new Promise<number>((resolve, reject) => {
    child.on("exit", (code) => {
      if (code == null && receivedSignal != null) {
        resolve(getSignalAbortCode(receivedSignal) ?? 1);
      } else {
        resolve(code ?? 0);
      }
    });
  });
  return {
    async pipeToStdin(source: Reader, signal: AbortSignal) {
      const stdin = child.stdin!;
      try {
        const buffer = new Uint8Array(1024);
        while (true) {
          signal.throwIfAborted();
          const bytesRead = await source.read(buffer);
          if (bytesRead === null) {
            break;
          }
          if (bytesRead > 0) {
            await new Promise<void>((resolve, reject) => {
              const chunk = buffer.slice(0, bytesRead);
              stdin.write(chunk, (err) => {
                if (err) {
                  reject(err);
                } else {
                  resolve();
                }
              });
            });
          }
        }
      } finally {
        stdin.end();
      }
    },
    kill(signo?: Deno.Signal) {
      receivedSignal = signo;
      child.kill(signo as any);
    },
    waitExitCode() {
      return exitCode;
    },
    async pipeStdoutTo(writer: ShellPipeWriter, signal: AbortSignal) {
      const stdout = child.stdout!;
      for await (const chunk of stdout) {
        signal.throwIfAborted();

        const uint8ArrayChunk = new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength);
        const maybePromise = writer.writeAll(uint8ArrayChunk);
        if (maybePromise instanceof Promise) {
          await maybePromise;
        }
      }
    },
    async pipeStderrTo(writer: ShellPipeWriter, signal: AbortSignal) {
      // todo: consolidate with above
      const stderr = child.stderr!;
      for await (const chunk of stderr) {
        signal.throwIfAborted();

        const uint8ArrayChunk = new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength);
        const maybePromise = writer.writeAll(uint8ArrayChunk);
        if (maybePromise instanceof Promise) {
          await maybePromise;
        }
      }
    },
  };
};
