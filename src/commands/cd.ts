import { CommandContext } from "../command_handler.ts";
import { errorToString, resolvePath } from "../common.ts";
import { ExecuteResult } from "../result.ts";

export async function cdCommand(context: CommandContext): Promise<ExecuteResult> {
  try {
    const dir = await executeCd(context.cwd, context.args);
    return {
      code: 0,
      changes: [{
        kind: "cd",
        dir,
      }],
    };
  } catch (err) {
    return context.error(`cd: ${errorToString(err)}`);
  }
}

async function executeCd(cwd: string, args: string[]) {
  const arg = parseArgs(args);
  const result = resolvePath(cwd, arg);
  if (!await isDirectory(result)) {
    throw new Error(`${result}: Not a directory`);
  }
  return result;
}

async function isDirectory(path: string) {
  try {
    const info = await Deno.stat(path);
    return info.isDirectory;
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      return false;
    } else {
      throw err;
    }
  }
}

function parseArgs(args: string[]) {
  if (args.length === 0) {
    throw new Error("expected at least 1 argument");
  } else if (args.length > 1) {
    throw new Error("too many arguments");
  } else {
    return args[0];
  }
}
