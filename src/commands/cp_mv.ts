import * as path from "@std/path";
import type { CommandContext } from "../command_handler.ts";
import { errorToString, resolvePath, safeLstat } from "../common.ts";
import type { ExecuteResult } from "../result.ts";
import { bailUnsupported, parseArgKinds } from "./args.ts";

export async function cpCommand(
  context: CommandContext,
): Promise<ExecuteResult> {
  try {
    await executeCp(context.cwd, context.args);
    return { code: 0 };
  } catch (err) {
    return context.error(`cp: ${errorToString(err)}`);
  }
}

interface PathWithSpecified {
  path: string;
  specified: string;
}

interface CopyFlags {
  recursive: boolean;
  operations: { from: PathWithSpecified; to: PathWithSpecified }[];
}

async function executeCp(cwd: string, args: string[]) {
  const flags = await parseCpArgs(cwd, args);
  for (const { from, to } of flags.operations) {
    await doCopyOperation(flags, from, to);
  }
}

export async function parseCpArgs(cwd: string, args: string[]): Promise<CopyFlags> {
  const paths = [];
  let recursive = false;
  for (const arg of parseArgKinds(args)) {
    if (arg.kind === "Arg") paths.push(arg.arg);
    else if (
      (arg.arg === "recursive" && arg.kind === "LongFlag")
      || (arg.arg === "r" && arg.kind == "ShortFlag")
      || (arg.arg === "R" && arg.kind === "ShortFlag")
    ) {
      recursive = true;
    } else bailUnsupported(arg);
  }
  if (paths.length === 0) throw Error("missing file operand");
  else if (paths.length === 1) throw Error(`missing destination file operand after '${paths[0]}'`);

  return { recursive, operations: await getCopyAndMoveOperations(cwd, paths) };
}

async function doCopyOperation(
  flags: CopyFlags,
  from: PathWithSpecified,
  to: PathWithSpecified,
) {
  // These are racy with the file system, but that's ok.
  // They only exists to give better error messages.
  const fromInfo = await safeLstat(from.path);
  if (fromInfo?.isDirectory) {
    if (flags.recursive) {
      const toInfo = await safeLstat(to.path);
      if (toInfo?.isFile) {
        throw Error("destination was a file");
      } else if (toInfo?.isSymlink) {
        throw Error("no support for copying to symlinks");
      } else if (fromInfo.isSymlink) {
        throw Error("no support for copying from symlinks");
      } else {
        await copyDirRecursively(from.path, to.path);
      }
    } else {
      throw Error("source was a directory; maybe specify -r");
    }
  } else {
    await Deno.copyFile(from.path, to.path);
  }
}

async function copyDirRecursively(from: string, to: string) {
  await Deno.mkdir(to, { recursive: true });
  const readDir = Deno.readDir(from);
  for await (const entry of readDir) {
    const newFrom = path.join(from, path.basename(entry.name));
    const newTo = path.join(to, path.basename(entry.name));
    if (entry.isDirectory) {
      await copyDirRecursively(newFrom, newTo);
    } else if (entry.isFile) {
      await Deno.copyFile(newFrom, newTo);
    }
  }
}

export async function mvCommand(
  context: CommandContext,
): Promise<ExecuteResult> {
  try {
    await executeMove(context.cwd, context.args);
    return { code: 0 };
  } catch (err) {
    return context.error(`mv: ${errorToString(err)}`);
  }
}

interface MoveFlags {
  operations: { from: PathWithSpecified; to: PathWithSpecified }[];
}

async function executeMove(cwd: string, args: string[]) {
  const flags = await parseMvArgs(cwd, args);
  for (const { from, to } of flags.operations) {
    await Deno.rename(from.path, to.path);
  }
}

export async function parseMvArgs(cwd: string, args: string[]): Promise<MoveFlags> {
  const paths = [];

  for (const arg of parseArgKinds(args)) {
    if (arg.kind === "Arg") paths.push(arg.arg);
    else bailUnsupported(arg);
  }

  if (paths.length === 0) throw Error("missing operand");
  else if (paths.length === 1) throw Error(`missing destination file operand after '${paths[0]}'`);

  return { operations: await getCopyAndMoveOperations(cwd, paths) };
}

async function getCopyAndMoveOperations(
  cwd: string,
  paths: string[],
) {
  // copy and move share the same logic
  const specified_destination = paths.splice(paths.length - 1, 1)[0];
  const destination = resolvePath(cwd, specified_destination);
  const fromArgs = paths;
  const operations = [];
  if (fromArgs.length > 1) {
    if (!await safeLstat(destination).then((p) => p?.isDirectory)) {
      throw Error(`target '${specified_destination}' is not a directory`);
    }
    for (const from of fromArgs) {
      const fromPath = resolvePath(cwd, from);
      const toPath = path.join(destination, path.basename(fromPath));
      operations.push(
        {
          from: {
            specified: from,
            path: fromPath,
          },
          to: {
            specified: specified_destination,
            path: toPath,
          },
        },
      );
    }
  } else {
    const fromPath = resolvePath(cwd, fromArgs[0]);

    const toPath = await safeLstat(destination).then((p) => p?.isDirectory)
      ? calculateDestinationPath(destination, fromPath)
      : destination;

    operations.push({
      from: {
        specified: fromArgs[0],
        path: fromPath,
      },
      to: {
        specified: specified_destination,
        path: toPath,
      },
    });
  }
  return operations;
}

/**  Calculates destination path
 * destination should be a directory
 * example:
 *          destination: /dir/a
 *          from       : /path/file
 *          returns    : /dir/a/file
 */
function calculateDestinationPath(destination: string, from: string) {
  return path.join(destination, path.basename(from));
}
