import type { CommandContext } from "../command_handler.ts";
import type { ExecuteResult } from "../result.ts";
import { bailUnsupported, parseArgKinds } from "./args.ts";
import { errorToString, resolvePath } from "../common.ts";

interface CatFlags {
  paths: string[];
}

export async function catCommand(
  context: CommandContext,
): Promise<ExecuteResult> {
  try {
    const code = await executeCat(context);
    return { code };
  } catch (err) {
    return context.error(`cat: ${errorToString(err)}`);
  }
}

async function executeCat(context: CommandContext) {
  const flags = parseCatArgs(context.args);
  let exitCode = 0;
  const buf = new Uint8Array(1024);

  for (const path of flags.paths) {
    if (path === "-") { // read from stdin
      if (typeof context.stdin === "object") { // stdin is a Reader
        while (!context.signal.aborted) {
          const size = await context.stdin.read(buf);
          if (!size || size === 0) {
            break;
          } else {
            const maybePromise = context.stdout.write(buf.slice(0, size));
            if (maybePromise instanceof Promise) {
              await maybePromise;
            }
          }
        }
        exitCode = context.signal.abortedExitCode ?? 0;
      } else {
        const _assertValue: "null" | "inherit" = context.stdin;
        throw new Error(`not supported. stdin was '${context.stdin}'`);
      }
    } else {
      let file;
      try {
        file = await Deno.open(resolvePath(context.cwd, path), { read: true });
        while (!context.signal.aborted) {
          // NOTE: rust supports cancellation here
          const size = file.readSync(buf);
          if (!size || size === 0) {
            break;
          } else {
            const maybePromise = context.stdout.write(buf.slice(0, size));
            if (maybePromise instanceof Promise) {
              await maybePromise;
            }
          }
        }
        exitCode = context.signal.abortedExitCode ?? 0;
      } catch (err) {
        const maybePromise = context.stderr.writeLine(`cat ${path}: ${errorToString(err)}`);
        if (maybePromise instanceof Promise) {
          await maybePromise;
        }
        exitCode = 1;
      } finally {
        file?.close();
      }
    }
  }
  return exitCode;
}

export function parseCatArgs(args: string[]): CatFlags {
  const paths = [];
  for (const arg of parseArgKinds(args)) {
    if (arg.kind === "Arg") {
      paths.push(arg.arg);
    } else {
      bailUnsupported(arg); // for now, we don't support any arguments
    }
  }

  if (paths.length === 0) {
    paths.push("-");
  }
  return { paths };
}
