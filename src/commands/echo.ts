import { CommandContext } from "../command_handler.ts";
import { ExecuteResult, resultFromCode } from "../result.ts";

export async function echoCommand(context: CommandContext): Promise<ExecuteResult> {
  await context.stdout.writeLine(context.args.join(" "));
  return resultFromCode(0);
}
