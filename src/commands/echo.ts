import { ExecuteResult, resultFromCode } from "../result.ts";
import { Context } from "../shell.ts";

export async function echoCommand(context: Context, args: string[]): Promise<ExecuteResult> {
  await context.stdout.writeLine(args.join(" "));
  return resultFromCode(0);
}
