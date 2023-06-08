import { CommandContext } from "../command_handler.ts";
import { resolvePath } from "../common.ts";
import { safeLstat } from "../common.ts";
import { ExecuteResult, resultFromCode } from "../result.ts";
import { bailUnsupported, parseArgKinds } from "./args.ts";

export async function mkdirCommand(
  context: CommandContext,
): Promise<ExecuteResult> {
  try {
    await executeMkdir(context.cwd, context.args);
    return resultFromCode(0);
  } catch (err) {
    context.stderr.writeLine(`mkdir: ${err?.message ?? err}`);
    return resultFromCode(1);
  }
}

interface MkdirFlags {
  parents: boolean;
  paths: string[];
}

async function executeMkdir(cwd: string, args: string[]) {
  const flags = parseArgs(args);
  for (const specifiedPath of flags.paths) {
    const path = resolvePath(cwd, specifiedPath);
    const info = await safeLstat(path);
    if (info?.isFile || (!flags.parents && info?.isDirectory)) {
      throw Error(`cannot create directory '${specifiedPath}': File exists`);
    }
    if (flags.parents) {
      await Deno.mkdir(path, { recursive: true });
    } else {
      await Deno.mkdir(path);
    }
  }
}

export function parseArgs(args: string[]) {
  const result: MkdirFlags = {
    parents: false,
    paths: [],
  };

  for (const arg of parseArgKinds(args)) {
    if (
      (arg.arg === "parents" && arg.kind === "LongFlag") ||
      (arg.arg === "p" && arg.kind == "ShortFlag")
    ) {
      result.parents = true;
    } else {
      if (arg.kind !== "Arg") bailUnsupported(arg);
      result.paths.push(arg.arg.trim()); // NOTE: rust version doesn't trim
    }
  }
  if (result.paths.length === 0) {
    throw Error("missing operand");
  }
  return result;
}
