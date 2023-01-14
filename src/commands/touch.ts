import { CommandContext } from "../command_handler.ts";
import { resultFromCode } from "../result.ts";
import { bailUnsupported, parseArgKinds } from "./args.ts";

export async function touchCommand(context: CommandContext) {
  try {
    await executetouch(context.args);
    return resultFromCode(0);
  } catch (err) {
    context.stderr.writeLine(`touch: ${err?.message ?? err}`);
    return resultFromCode(1);
  }
}

async function executetouch(args: string[]) {
  const flags = parseArgs(args);
  for (const path of flags.paths) {
    const f = await Deno.create(path);
    f.close();
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
