import type { CommandContext } from "../command_handler.ts";
import { errorToString } from "../common.ts";
import type { ExecuteResult } from "../result.ts";
import { whichFromContext } from "../shell.ts";
import { type ArgKind, parseArgKinds } from "./args.ts";

export async function whichCommand(
  context: CommandContext,
): Promise<ExecuteResult> {
  try {
    return await executeWhich(context);
  } catch (err) {
    return context.error(`which: ${errorToString(err)}`);
  }
}

interface WhichFlags {
  commandName: string | undefined;
}

async function executeWhich(context: CommandContext): Promise<ExecuteResult> {
  let flags: WhichFlags;
  try {
    flags = parseArgs(context.args);
  } catch (err) {
    return await context.error(2, `which: ${errorToString(err)}`);
  }
  if (flags.commandName == null) {
    return { code: 1 };
  }
  const path = await whichFromContext(flags.commandName, {
    getVar(key) {
      return context.env[key];
    },
  });
  if (path != null) {
    await context.stdout.writeLine(path);
    return { code: 0 };
  } else {
    return { code: 1 };
  }
}

export function parseArgs(args: string[]) {
  let commandName: string | undefined;

  for (const arg of parseArgKinds(args)) {
    if (arg.kind === "Arg") {
      if (commandName != null) {
        throw Error("unsupported too many arguments");
      }
      commandName = arg.arg;
    } else {
      bailUnsupported(arg);
    }
  }
  return {
    commandName,
  };
}

function bailUnsupported(arg: ArgKind): never {
  switch (arg.kind) {
    case "Arg":
      throw Error(`unsupported argument: ${arg.arg}`);
    case "ShortFlag":
      throw Error(`unsupported flag: -${arg.arg}`);
    case "LongFlag":
      throw Error(`unsupported flag: --${arg.arg}`);
  }
}
