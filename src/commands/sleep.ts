import { CommandContext } from "../command_handler.ts";
import { ExecuteResult, getAbortedResult, resultFromCode } from "../result.ts";

export async function sleepCommand(context: CommandContext): Promise<ExecuteResult> {
  try {
    const ms = parseArgs(context.args);
    await new Promise<void>((resolve) => {
      const timeoutId = setTimeout(finish, ms);
      context.signal.addListener(signalListener);

      function signalListener(_signal: Deno.Signal) {
        // finish if it was a signal that caused an abort, otherwise ignore
        if (context.signal.aborted) {
          finish();
        }
      }

      function finish() {
        resolve();
        clearInterval(timeoutId);
        context.signal.removeListener(signalListener);
      }
    });
    if (context.signal.aborted) {
      return getAbortedResult();
    }
    return resultFromCode(0);
  } catch (err) {
    context.stderr.writeLine(`sleep: ${err?.message ?? err}`);
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
