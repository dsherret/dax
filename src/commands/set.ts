import type { CommandContext } from "../command_handler.ts";
import type { EnvChange, ExecuteResult } from "../result.ts";
import { ShellOption } from "../result.ts";

export function setCommand(context: CommandContext): ExecuteResult | Promise<ExecuteResult> {
  const args = context.args;

  // no arguments - in bash this would set positional parameters
  // for now, just return success
  if (args.length === 0) {
    return { code: 0 };
  }

  // set -o (list options in human-readable format)
  if (args.length === 1 && args[0] === "-o") {
    const opts = context.shellOptions;
    context.stdout.writeLine(`pipefail\t${opts.pipefail ? "on" : "off"}`);
    return { code: 0 };
  }

  // set +o (output commands to recreate current settings)
  if (args.length === 1 && args[0] === "+o") {
    const opts = context.shellOptions;
    context.stdout.writeLine(`set ${opts.pipefail ? "-o" : "+o"} pipefail`);
    return { code: 0 };
  }

  // parse option changes: set -o opt1 -o opt2 +o opt3 ...
  const changes: EnvChange[] = [];
  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if ((arg === "-o" || arg === "+o") && i + 1 < args.length) {
      const enable = arg === "-o";
      const optionName = args[i + 1];
      const option = parseOptionName(optionName);
      if (option === undefined) {
        return context.error(`set: unknown option: ${optionName}`);
      }
      changes.push({
        kind: "setoption",
        option,
        value: enable,
      });
      i += 2;
    } else {
      return context.error(`set: invalid option: ${arg}`);
    }
  }

  return { code: 0, changes };
}

function parseOptionName(name: string): ShellOption | undefined {
  switch (name) {
    case "pipefail":
      return ShellOption.PipeFail;
    default:
      return undefined;
  }
}
