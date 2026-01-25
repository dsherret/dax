import type { CommandContext } from "../command_handler.ts";
import type { EnvChange, ExecuteResult, ShellOption } from "../result.ts";

const SET_OPTIONS = ["pipefail"] as const;
type SetOption = typeof SET_OPTIONS[number];

function isSetOption(name: string): name is SetOption {
  return SET_OPTIONS.includes(name as SetOption);
}

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
      if (!isSetOption(optionName)) {
        return context.error(`set: unknown option: ${optionName}`);
      }
      changes.push({
        kind: "setoption",
        option: optionName,
        value: enable,
      });
      i += 2;
    } else {
      return context.error(`set: invalid option: ${arg}`);
    }
  }

  return { code: 0, changes };
}
