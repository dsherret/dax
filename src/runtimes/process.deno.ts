import { pipeReadableToWriterSync, ShellPipeWriter } from "../pipes.ts";
import { SpawnCommand } from "./process.common.ts";

export const spawnCommand: SpawnCommand = (path, options) => {
  const child = new Deno.Command(path, options).spawn();
  child.status;
  return {
    getWritableStdin() {
      return child.stdin;
    },
    kill(signo?: Deno.Signal) {
      child.kill(signo);
    },
    waitExitCode() {
      return child.status.then((status) => status.code);
    },
    pipeStdoutTo(writer: ShellPipeWriter, signal: AbortSignal) {
      return pipeReadableToWriterSync(child.stdout, writer, signal);
    },
    pipeStderrTo(writer: ShellPipeWriter, signal: AbortSignal) {
      return pipeReadableToWriterSync(child.stderr, writer, signal);
    },
  };
};
