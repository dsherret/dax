import { ShellPipeWriter } from "../pipes.ts";
import { ExecuteResult, resultFromCode } from "../result.ts";

export async function sleepCommand(args: string[], stderr: ShellPipeWriter): Promise<ExecuteResult> {
  try {
    const ms = parseArgs(args);
    await new Promise(resolve => setTimeout(resolve, ms));
    return resultFromCode(0);
  } catch (err) {
    await stderr.writeLine(`sleep: ${err?.message ?? err}`);
    return resultFromCode(1);
  }
}

function parseArgs(args: string[]) {
  // time to sleep is the sum of all the arguments
  let totalTimeMs = 0;
  if (args.length === 0) {
    throw new Error("missing operand");
  }
  for (const arg of args) {
    if (arg.startsWith("-")) {
      throw new Error(`unsupported: ${arg}`);
    }

    const value = parseFloat(arg);
    if (isNaN(value)) {
      throw new Error(`error parsing argument '${arg}' to number.`);
    }
    totalTimeMs = value * 1000;
  }
  return totalTimeMs;
}
