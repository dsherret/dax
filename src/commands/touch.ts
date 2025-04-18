import type { CommandContext } from "../command_handler.ts";
import { errorToString } from "../common.ts";
import { bailUnsupported, parseArgKinds } from "./args.ts";
import { join } from "@std/path/join";

export async function touchCommand(context: CommandContext) {
  try {
    await executetouch(context.args, context.cwd);
    return { code: 0 };
  } catch (err) {
    return context.error(`touch: ${errorToString(err)}`);
  }
}

async function executetouch(args: string[], cwd: string) {
  const flags = parseArgs(args);
  for (const path of flags.paths) {
    using _f = await Deno.create(join(cwd, path));
  }
}

interface TouchFlags {
  paths: string[];
}

export function parseArgs(args: string[]): TouchFlags {
  const paths = [];
  for (const arg of parseArgKinds(args)) {
    if (arg.kind === "Arg") paths.push(arg.arg);
    else bailUnsupported(arg);
  }

  if (paths.length === 0) throw Error("missing file operand");
  return { paths };
}
