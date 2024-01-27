import { CommandContext } from "../command_handler.ts";
import { ExecuteResult } from "../result.ts";

export function exitCommand(context: CommandContext): ExecuteResult | Promise<ExecuteResult> {
  try {
    const code = parseArgs(context.args);
    return {
      kind: "exit",
      code,
    };
  } catch (err) {
    return context.error(2, `exit: ${err?.message ?? err}`);
  }
}

function parseArgs(args: string[]) {
  // no explicit code defaults to 1
  if (args.length === 0) return 1;
  if (args.length > 1) throw new Error("too many arguments");
  const exitCode = parseInt(args[0], 10);
  if (isNaN(exitCode)) throw new Error("numeric argument required.");
  if (exitCode < 0) {
    const code = -exitCode % 256;
    return 256 - code;
  }
  return exitCode % 256;
}
