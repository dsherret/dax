import * as path from "$std/path/mod.ts";
import { CommandContext } from "../command_handler.ts";
import { ExecuteResult, resultFromCode } from "../result.ts";
import { bailUnsupported, parseArgKinds } from "./args.ts";

export function pwdCommand(context: CommandContext): ExecuteResult {
  try {
    const output = executePwd(context.cwd, context.args);
    context.stdout.writeLine(output);
    return resultFromCode(0);
  } catch (err) {
    context.stderr.writeLine(`pwd: ${err?.message ?? err}`);
    return resultFromCode(1);
  }
}

function executePwd(cwd: string, args: string[]) {
  const flags = parseArgs(args);
  if (flags.logical) {
    return path.resolve(cwd);
  } else {
    return cwd;
  }
}

interface PwdFlags {
  logical: boolean;
}

export function parseArgs(args: string[]): PwdFlags {
  let logical = false;
  for (const arg of parseArgKinds(args)) {
    if (arg.arg === "L" && arg.kind === "ShortFlag") {
      logical = true;
    } else if (arg.arg === "P" && arg.kind == "ShortFlag") {
      // ignore, this is the default
    } else if (arg.kind === "Arg") {
      // args are ignored by pwd
    } else {
      bailUnsupported(arg);
    }
  }

  return { logical };
}
