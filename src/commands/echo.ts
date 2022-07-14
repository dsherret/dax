import { ShellPipeWriter } from "../pipes.ts";
import { ExecuteResult, resultFromCode } from "../result.ts";

export async function echoCommand(args: string[], stdout: ShellPipeWriter): Promise<ExecuteResult> {
  await stdout.writeLine(args.join(" "));
  return resultFromCode(0);
}
