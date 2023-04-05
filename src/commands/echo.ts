import { CommandContext } from "../command_handler.ts";
import { ExecuteResult, resultFromCode } from "../result.ts";

export function echoCommand(context: CommandContext): ExecuteResult {
  context.stdout.writeLine(context.args.join(" "));
  return resultFromCode(0);
}
