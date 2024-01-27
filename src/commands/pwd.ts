import { CommandContext } from "../command_handler.ts";
import { path } from "../deps.ts";
import { ExecuteResult } from "../result.ts";
import { bailUnsupported, parseArgKinds } from "./args.ts";

export function pwdCommand(context: CommandContext): ExecuteResult | Promise<ExecuteResult> {
  try {
    const output = executePwd(context.cwd, context.args);
    const maybePromise = context.stdout.writeLine(output);
    const result = { code: 0 };
    if (maybePromise instanceof Promise) {
      return maybePromise.then(() => result).catch((err) => handleError(context, err));
    } else {
      return result;
    }
  } catch (err) {
    return handleError(context, err);
  }
}

function handleError(context: CommandContext, err: any) {
  return context.error(`pwd: ${err?.message ?? err}`);
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
