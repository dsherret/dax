import { resolvePath } from "../common.ts";
import { fs } from "../deps.ts";
import { ShellPipeWriter } from "../pipes.ts";
import { ExecuteResult, resultFromCode } from "../result.ts";

export async function testCommand(cwd: string, args: string[], stderr: ShellPipeWriter): Promise<ExecuteResult> {
  try {
    const [testFlag, testPath] = parseArgs(cwd, args);
    let result;
    switch (testFlag) {
      case '-f':
        result = stat(testPath, info => info.isFile);
        break;

      case '-d':
        result = stat(testPath, info => info.isDirectory);
        break;

      case '-e':
        result = fs.exists(testPath);
        break;

      case '-s':
        result = stat(testPath, info => info.size > 0);
        break;

      case '-L':
        result = stat(testPath, info => info.isSymlink);
        break;

      default:
        throw new Error('unsupported test type');
    }
    return resultFromCode(await result ? 0 : 1);
  } catch (err) {
    await stderr.writeLine(`test: ${err?.message ?? err}`);
    // bash test returns 2 on error, e.g. -bash: test: -8: unary operator expected
    return resultFromCode(2);
  }
}

function parseArgs(cwd: string, args: string[]) {
  if (args.length !== 2) {
    throw new Error("expected 2 arguments");
  }

  if (args[0] == null || !args[0].startsWith('-')) {
    throw new Error('missing test type flag');
  }

  return [args[0], resolvePath(cwd, args[1])];
}

async function stat(path: string, test: (info: Deno.FileInfo) => boolean) {
  try {
    const info = await Deno.stat(path);
    return test(info);
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      return false;
    } else {
      throw err;
    }
  }
}
