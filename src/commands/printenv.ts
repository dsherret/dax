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
    // this is what printenv in linux does (on my testing)
    if (args.some((arg) => context.env[arg] === undefined)) {
      return resultFromCode(1);
    }
    return resultFromCode(0);
  } catch (err) {
    context.stderr.writeLine(`printenv: ${err?.message ?? err}`);
    return resultFromCode(1);
  }
}

/** follows printenv on linux:
- if arguments are provided, return a string containing a list of all env variables as `repeat(KEY=VALUE\n)`
- if no arguments are provided, return a string containing a list of the values of the provided env vars as `repeat(VALUE\n)`
**/
function executePrintEnv(env: Record<string, string>, args: string[]) {
  if (args.length === 0) {
    return Object.entries(env)
      .map(([key, val]) => `${key.toLowerCase()}=${val}`) // toLowerCase for windows (env vars are upcased)
      .join("\n");
  } else {
    return Object.entries(env)
      .filter(([key]) => args.includes(key))
      .map(([_key, val]) => val)
      .join("\n");
  }
}
