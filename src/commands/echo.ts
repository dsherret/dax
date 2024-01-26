import { CommandContext } from "../command_handler.ts";
import { ExecuteResult } from "../result.ts";

export function echoCommand(context: CommandContext): ExecuteResult {
  context.stdout.writeLine(context.args.join(" "));
  return { code: 0 };
}
