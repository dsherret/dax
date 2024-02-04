import { SpawnCommand } from "./process.common.ts";

export const spawnCommand: SpawnCommand = (path, options) => {
  const child = new Deno.Command(path, options).spawn();
  child.status;
  return {
    stdin() {
      return child.stdin;
    },
    kill(signo?: Deno.Signal) {
      child.kill(signo);
    },
    waitExitCode() {
      return child.status.then((status) => status.code);
    },
    stdout() {
      return child.stdout;
    },
    stderr() {
      return child.stderr;
    },
  };
};
