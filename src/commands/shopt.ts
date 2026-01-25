import type { CommandContext } from "../command_handler.ts";
import type { EnvChange, ExecuteResult } from "../result.ts";
import { ShellOption } from "../result.ts";

const VALID_OPTIONS = ["nullglob", "failglob", "globstar"] as const;
type ShoptOptionName = typeof VALID_OPTIONS[number];

function parseOptionName(name: string): ShellOption | undefined {
  switch (name) {
    case "nullglob":
      return ShellOption.NullGlob;
    case "failglob":
      return ShellOption.FailGlob;
    case "globstar":
      return ShellOption.GlobStar;
    default:
      return undefined;
  }
}

function optionToName(option: ShellOption): string {
  switch (option) {
    case ShellOption.NullGlob:
      return "nullglob";
    case ShellOption.FailGlob:
      return "failglob";
    case ShellOption.GlobStar:
      return "globstar";
    case ShellOption.PipeFail:
      return "pipefail";
  }
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
    const opt = parseOptionName(arg);
    if (opt === undefined) {
      return invalidOptionError(context, arg);
    }
    options.push(opt);
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
      const name = optionToName(opt);
      const isOn = currentOptions[name as ShoptOptionName];
      if (!isOn) {
        anyOff = true;
      }
      context.stdout.writeLine(`${name}\t${isOn ? "on" : "off"}`);
    }
    return { code: anyOff ? 1 : 0 };
  }
}
