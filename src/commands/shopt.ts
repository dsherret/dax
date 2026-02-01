import type { CommandContext } from "../command_handler.ts";
import type { EnvChange, ExecuteResult, ShellOption } from "../result.ts";

const SHOPT_OPTIONS = ["nullglob", "failglob", "globstar"] as const;
type ShoptOption = typeof SHOPT_OPTIONS[number];

function isShoptOption(name: string): name is ShoptOption {
  return SHOPT_OPTIONS.includes(name as ShoptOption);
}

function invalidOptionError(context: CommandContext, name: string) {
  return context.error(`shopt: ${name}: invalid shell option name`);
}

export function shoptCommand(context: CommandContext): ExecuteResult | Promise<ExecuteResult> {
  const args = context.args;

  // -s or -u must be the first argument (like bash)
  let mode: boolean | undefined; // undefined = query, true = -s, false = -u
  let optionArgs = args;

  if (args.length > 0) {
    if (args[0] === "-s") {
      mode = true;
      optionArgs = args.slice(1);
    } else if (args[0] === "-u") {
      mode = false;
      optionArgs = args.slice(1);
    }
  }

  // parse option names
  const options: ShellOption[] = [];
  for (const arg of optionArgs) {
    if (!isShoptOption(arg)) {
      return invalidOptionError(context, arg);
    }
    options.push(arg);
  }

  // set/unset mode
  if (mode !== undefined) {
    const changes: EnvChange[] = options.map((option) => ({
      kind: "setoption",
      option,
      value: mode!,
    }));
    return { code: 0, changes };
  }

  // query mode - print option status
  const currentOptions = context.shellOptions;

  if (options.length === 0) {
    // print all shopt options (alphabetical order)
    context.stdout.writeLine(`failglob\t${currentOptions.failglob ? "on" : "off"}`);
    context.stdout.writeLine(`globstar\t${currentOptions.globstar ? "on" : "off"}`);
    context.stdout.writeLine(`nullglob\t${currentOptions.nullglob ? "on" : "off"}`);
    return { code: 0 };
  } else {
    // print specified options and return non-zero if any are off
    let anyOff = false;
    for (const opt of options) {
      const isOn = currentOptions[opt];
      if (!isOn) {
        anyOff = true;
      }
      context.stdout.writeLine(`${opt}\t${isOn ? "on" : "off"}`);
    }
    return { code: anyOff ? 1 : 0 };
  }
}
