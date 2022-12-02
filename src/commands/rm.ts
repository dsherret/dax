import { CommandContext } from "../command_handler.ts";
import { resolvePath } from "../common.ts";
import { ExecuteResult, resultFromCode } from "../result.ts";

export async function rmCommand(
  context: CommandContext,
): Promise<ExecuteResult> {
  try {
    const rmCli = parseArgs(context.cwd, context.args);
    await Promise.all(
      rmCli.files.map((f) => Deno.remove(f, { recursive: rmCli.recursive })),
    );
    return resultFromCode(0);
  } catch (err) {
    context.stderr.writeLine(`rm: ${err?.message ?? err}`);
    return resultFromCode(2);
  }
}

interface RmCli {
  recursive: boolean;
  force: boolean;
  files: string[];
}

function parseArgs(cwd: string, args: string[]) {
  const res: RmCli = {
    recursive: false,
    force: false,
    files: [],
  };

  args.forEach((arg) => {
    switch (arg) {
      case "-r":
      case "--recursive":
        res.recursive = true;
        break;
      case "-f":
      case "--force":
        res.force = true;
        break;
      default:
        if (arg.startsWith("-")) throw "unsupported flag";
        res.files.push(resolvePath(cwd, arg));
        break;
    }
  });
  return res;
}
