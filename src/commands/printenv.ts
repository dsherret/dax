import type { CommandContext } from "../command_handler.ts";
import { errorToString } from "../common.ts";
import type { ExecuteResult } from "../result.ts";

export function printEnvCommand(context: CommandContext): ExecuteResult | Promise<ExecuteResult> {
  // windows expects env vars to be upcased
  let args;
  if (Deno.build.os === "windows") {
    args = context.args.map((arg) => arg.toUpperCase());
  } else {
    args = context.args;
  }

  try {
    const result = executePrintEnv(context.env, args);
    const code = args.some((arg) => context.env[arg] === undefined) ? 1 : 0;
    const maybePromise = context.stdout.writeLine(result);
    if (maybePromise instanceof Promise) {
      return maybePromise.then(() => ({ code })).catch((err) => handleError(context, err));
    } else {
      return { code };
    }
  } catch (err) {
    return handleError(context, err);
  }
}

function handleError(context: CommandContext, err: any): ExecuteResult | Promise<ExecuteResult> {
  return context.error(`printenv: ${errorToString(err)}`);
}

/**
 * follows printenv on linux:
 * - if arguments are provided, return a string containing a list of all env variables as `repeat(KEY=VALUE\n)`
 * - if no arguments are provided, return a string containing a list of the values of the provided env vars as `repeat(VALUE\n)`
 */
function executePrintEnv(env: Record<string, string>, args: string[]) {
  const isWindows = Deno.build.os === "windows";
  if (args.length === 0) {
    return Object.entries(env)
      // on windows, env vars are case insensitive
      .map(([key, val]) => `${isWindows ? key.toUpperCase() : key}=${val}`)
      .join("\n");
  } else {
    if (isWindows) {
      args = args.map((arg) => arg.toUpperCase());
    }
    return Object.entries(env)
      .filter(([key]) => args.includes(key))
      .map(([_key, val]) => val)
      .join("\n");
  }
}
