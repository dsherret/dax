import { ExecuteResult } from "../../mod.ts";
import { CommandContext } from "../command_handler.ts";
import { resultFromCode } from "../result.ts";

export function unsetCommand(context: CommandContext): ExecuteResult {
  try {
    return {
      kind: "continue",
      code: 0,
      changes: parseNames(context.args).map((name) => ({ kind: "unsetvar", name })),
    };
  } catch (err) {
    context.stderr.writeLine(`unset: ${err?.message ?? err}`);
    return resultFromCode(1);
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
