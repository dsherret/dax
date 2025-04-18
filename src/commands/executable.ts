import { existsSync } from "@std/fs/exists";
import type { CommandContext, CommandHandler, CommandPipeReader, CommandPipeWriter } from "../command_handler.ts";
import { errorToString } from "../common.ts";
import {
  pipeReadableToWriterSync,
  pipeReaderToWritable,
  type ShellPipeReaderKind,
  type ShellPipeWriterKind,
} from "../pipes.ts";
import type { ExecuteResult } from "../result.ts";
import { spawnCommand } from "../runtimes/process.deno.ts";
import type { SpawnedChildProcess } from "../runtimes/process.common.ts";

const neverAbortedSignal = new AbortController().signal;

/**
 * Creates a new command that runs the executable at the specified path.
 * @param resolvedPath A fully resolved path.
 * @returns Command handler that can be registered in a `CommandBuilder`.
 */
export function createExecutableCommand(resolvedPath: string): CommandHandler {
  return async function executeCommandAtPath(
    context: CommandContext,
  ): Promise<ExecuteResult> {
    const pipeStringVals = {
      stdin: getStdioStringValue(context.stdin),
      stdout: getStdioStringValue(context.stdout.kind),
      stderr: getStdioStringValue(context.stderr.kind),
    };
    let p: SpawnedChildProcess;
    const cwd = context.cwd;
    try {
      p = spawnCommand(resolvedPath, {
        args: context.args,
        cwd,
        env: context.env,
        clearEnv: true,
        ...pipeStringVals,
      });
    } catch (err) {
      // Deno throws this sync, Node.js throws it async
      throw checkMapCwdNotExistsError(cwd, err);
    }
    const listener = (signal: Deno.Signal) => p.kill(signal);
    context.signal.addListener(listener);
    const completeController = new AbortController();
    const completeSignal = completeController.signal;
    let stdinError: unknown | undefined;
    const stdinPromise = writeStdin(context.stdin, p, completeSignal)
      .catch(async (err) => {
        // don't surface anything because it's already been aborted
        if (completeSignal.aborted) {
          return;
        }

        const maybePromise = context.stderr.writeLine(`stdin pipe broken. ${errorToString(err)}`);
        if (maybePromise != null) {
          await maybePromise;
        }
        stdinError = err;
        // kill the sub process
        try {
          p.kill("SIGKILL");
        } catch (err) {
          if (!(err instanceof Deno.errors.PermissionDenied || err instanceof Deno.errors.NotFound)) {
            throw err;
          }
        }
      });
    try {
      // don't abort stdout and stderr reads... ensure all of stdout/stderr is
      // read in case the process exits before this finishes
      const readStdoutTask = pipeStringVals.stdout === "piped"
        ? readStdOutOrErr(p.stdout(), context.stdout)
        : Promise.resolve();
      const readStderrTask = pipeStringVals.stderr === "piped"
        ? readStdOutOrErr(p.stderr(), context.stderr)
        : Promise.resolve();
      const [exitCode] = await Promise.all([
        p.waitExitCode()
          // for node.js, which throws this async
          .catch((err) => Promise.reject(checkMapCwdNotExistsError(cwd, err))),
        readStdoutTask,
        readStderrTask,
      ]);
      if (stdinError != null) {
        return {
          code: 1,
          kind: "exit",
        };
      } else {
        return { code: exitCode };
      }
    } finally {
      completeController.abort();
      context.signal.removeListener(listener);

      // ensure this is done before exiting... it will never throw
      await stdinPromise;
    }
  };
}

async function writeStdin(stdin: CommandPipeReader, p: SpawnedChildProcess, signal: AbortSignal) {
  if (typeof stdin === "string") {
    return;
  }
  const processStdin = p.stdin();
  await pipeReaderToWritable(stdin, processStdin, signal);
  try {
    await processStdin.close();
  } catch {
    // ignore
  }
}

async function readStdOutOrErr(readable: ReadableStream<Uint8Array>, writer: CommandPipeWriter) {
  if (typeof writer === "string") {
    return;
  }
  // don't abort... ensure all of stdout/stderr is read in case the process
  // exits before this finishes
  await pipeReadableToWriterSync(readable, writer, neverAbortedSignal);
}

function getStdioStringValue(value: ShellPipeReaderKind | ShellPipeWriterKind) {
  if (value === "inheritPiped") {
    return "piped";
  } else if (value === "inherit" || value === "null" || value === "piped") {
    return value;
  } else {
    return "piped";
  }
}

function checkMapCwdNotExistsError(cwd: string, err: unknown) {
  if ((err as any).code === "ENOENT" && !existsSync(cwd)) {
    throw new Error(`Failed to launch command because the cwd does not exist (${cwd}).`, {
      cause: err,
    });
  } else {
    throw err;
  }
}
