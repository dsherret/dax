import { CommandContext } from "../command_handler.ts";
import { ExecuteResult, resultFromCode } from "../result.ts";

export function printEnvCommand(context: CommandContext): ExecuteResult {
  // windows expects env vars to be upcased
  let args;
  if (Deno.build.os === "windows") {
    args = context.args.map((arg) => arg.toUpperCase());
  } else {
    args = context.args;
  }

  try {
    const result = executePrintEnv(context.env, args);
    context.stdout.writeLine(result);
    if (args.some((arg) => context.env[arg] === undefined)) {
      return resultFromCode(1);
    }
    return resultFromCode(0);
  } catch (err) {
    context.stderr.writeLine(`printenv: ${err?.message ?? err}`);
    return resultFromCode(1);
  }
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
