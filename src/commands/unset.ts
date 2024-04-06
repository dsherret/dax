import type { CommandContext } from "../command_handler.ts";
import { errorToString } from "../common.ts";
import type { ExecuteResult } from "../result.ts";

export function unsetCommand(context: CommandContext): ExecuteResult | Promise<ExecuteResult> {
  try {
    return {
      code: 0,
      changes: parseNames(context.args).map((name) => ({ kind: "unsetvar", name })),
    };
  } catch (err) {
    return context.error(`unset: ${errorToString(err)}`);
  }
}

function parseNames(args: string[]) {
  if (args[0] === "-f") {
    // we don't support the -f (function) flag
    throw Error(`unsupported flag: -f`);
  } else if (args[0] === "-v") {
    return args.slice(1);
  } else {
    return args;
  }
}
