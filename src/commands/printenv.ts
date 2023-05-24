import { CommandContext } from "../command_handler.ts";
import { ExecuteResult, resultFromCode } from "../result.ts";

export function printEnvCommand(context: CommandContext): ExecuteResult {
  console.log(context);
  try {
    const result = executePrintEnv(context.env, context.args);
    context.stdout.writeLine(result);
    if (context.args.some((arg) => context.env[arg] === undefined)) {
      return resultFromCode(1);
    }
    return resultFromCode(0);
  } catch (err) {
    context.stderr.writeLine(`printenv: ${err?.message ?? err}`);
    return resultFromCode(1);
  }
}

function executePrintEnv(env: Record<string, string>, args: string[]) {
  if (args.length === 0) {
    return Object.entries(env)
      .map(([key, val]) => `${key}=${val}`)
      .join("\n");
  } else {
    return Object.entries(env)
      .filter(([key]) => args.includes(key))
      .map(([_key, val]) => val)
      .join("\n");
  }
}
