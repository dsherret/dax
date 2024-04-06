import type { CommandContext } from "../command_handler.ts";
import { errorToString } from "../common.ts";
import type { ExecuteResult } from "../result.ts";

export function echoCommand(context: CommandContext): ExecuteResult | Promise<ExecuteResult> {
  try {
    const maybePromise = context.stdout.writeLine(context.args.join(" "));
    if (maybePromise instanceof Promise) {
      return maybePromise.then(() => ({ code: 0 })).catch((err) => handleFailure(context, err));
    } else {
      return { code: 0 };
    }
  } catch (err) {
    return handleFailure(context, err);
  }
}

function handleFailure(context: CommandContext, err: any) {
  return context.error(`echo: ${errorToString(err)}`);
}
