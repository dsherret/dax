import { CommandContext } from "../command_handler.ts";
import { resolvePath, safeLstat } from "../common.ts";
import { fs } from "../deps.ts";
import { ExecuteResult, resultFromCode } from "../result.ts";

export async function testCommand(context: CommandContext): Promise<ExecuteResult> {
  try {
    const [testFlag, testPath] = parseArgs(context.cwd, context.args);
    let result: boolean;
    switch (testFlag) {
      case "-f":
        result = (await safeLstat(testPath))?.isFile ?? false;
        break;

      case "-d":
        result = (await safeLstat(testPath))?.isDirectory ?? false;
        break;

      case "-e":
        result = await fs.exists(testPath);
        break;

      case "-s":
        result = ((await safeLstat(testPath))?.size ?? 0) > 0;
        break;

      case "-L":
        result = (await safeLstat(testPath))?.isSymlink ?? false;
        break;

      default:
        throw new Error("unsupported test type");
    }
    return resultFromCode(result ? 0 : 1);
  } catch (err) {
    context.stderr.writeLine(`test: ${err?.message ?? err}`);
    // bash test returns 2 on error, e.g. -bash: test: -8: unary operator expected
    return resultFromCode(2);
  }
}

function parseArgs(cwd: string, args: string[]) {
  if (args.length !== 2) {
    throw new Error("expected 2 arguments");
  }

  if (args[0] == null || !args[0].startsWith("-")) {
    throw new Error("missing test type flag");
  }

  return [args[0], resolvePath(cwd, args[1])];
}
