import { CommandContext } from "../command_handler.ts";
import { resolvePath } from "../common.ts";
import { ExecuteResult, resultFromCode } from "../result.ts";
import { ArgKind, parse_arg_kinds } from "./args.ts";

export async function rmCommand(
  context: CommandContext,
): Promise<ExecuteResult> {
  try {
    await executeRemove(context.cwd, context.args);
    return resultFromCode(0);
  } catch (err) {
    context.stderr.writeLine(`rm: ${err?.message ?? err}`);
    return resultFromCode(1);
  }
}

interface RmFlags {
  force: boolean;
  recursive: boolean;
  dir: boolean;
  paths: string[];
}

async function executeRemove(cwd: string, args: string[]) {
  const flags = parseArgs(args);
  await Promise.all(flags.paths.map((specifiedPath) => {
    if (specifiedPath.length === 0) {
      throw new Error("Bug in dax. Specified path should have not been empty.");
    }
    const path = resolvePath(cwd, specifiedPath);
    if (path === "/") {
      // just in case...
      throw new Error("Cannot delete root directory. Maybe bug in dax? Please report this.");
    }
    return Deno.remove(path, { recursive: flags.recursive });
  }));
}

export function parseArgs(args: string[]) {
  const result: RmFlags = {
    recursive: false,
    force: false,
    dir: false,
    paths: [],
  };

  for (const arg of parse_arg_kinds(args)) {
    if (
      (arg.arg === "recursive" && arg.kind === "LongFlag") ||
      (arg.arg === "r" && arg.kind == "ShortFlag") ||
      (arg.arg === "R" && arg.kind === "ShortFlag")
    ) {
      result.recursive = true;
    } else if (
      (arg.arg == "dir" && arg.kind === "LongFlag") ||
      (arg.arg == "d" && arg.kind === "ShortFlag")
    ) {
      result.dir = true;
    } else if (
      (arg.arg == "force" && arg.kind === "LongFlag") ||
      (arg.arg == "f" && arg.kind === "ShortFlag")
    ) {
      result.force = true;
    } else {
      if (arg.kind !== "Arg") bailUnsupported(arg);
      result.paths.push(arg.arg.trim());
    }
  }
  if (result.paths.length === 0) {
    throw Error("missing operand");
  }
  return result;
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
