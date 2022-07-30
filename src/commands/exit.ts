import { ShellPipeWriter } from "../pipes.ts";
import { ExitExecuteResult } from "../result.ts";

export async function exitCommand(args: string[], stderr: ShellPipeWriter): Promise<ExitExecuteResult> {
  try {
    const code = parseArgs(args);
    return {
      kind: 'exit',
      code,
    }
  } catch (err) {
    await stderr.writeLine(`exit: ${err?.message ?? err}`);
    // impl. note: bash returns 2 on exit parse failure, deno_task_shell returns 1
    return {
      kind: 'exit',
      code: 2,
    };
  }
}

function parseArgs(args: string[]) {
  // no explicit code defaults to 1
  if (args.length === 0) return 1;
  if (args.length > 1) throw new Error('too many arguments');
  const exitCode = parseInt(args[0], 10);
  if (isNaN(exitCode)) throw new Error('numeric argument required.');
  if (exitCode < 0) {
    const code = -exitCode % 256;
    return 256 - code;
  }
  return exitCode % 256;
}
