import { CommandContext } from "../command_handler.ts";
import { ExecuteResult, resultFromCode } from "../result.ts";
import { isDir, isFile, isSymlink } from "../common.ts";
import { bailUnsupported, parse_arg_kinds } from "./args.ts";
import { fs } from "../deps.ts";
import { resolvePath, rustJoin } from "../common.ts";

export async function cpCommand(
  context: CommandContext,
): Promise<ExecuteResult> {
  try {
    await executeCp(context.cwd, context.args);
    return resultFromCode(0);
  } catch (err) {
    context.stderr.writeLine(`cp: ${err?.message ?? err}`);
    return resultFromCode(1);
  }
}

interface PathWithSpecified {
  path: string;
  specified: string;
}

interface cpFlags {
  recursive: boolean;
  operations: { from: PathWithSpecified; to: PathWithSpecified }[];
}

async function executeCp(cwd: string, args: string[]) {
  const flags = await parseCpArgs(cwd, args);
  for (const { from, to } of flags.operations) {
    await doCopyOperation(flags, from, to);
  }
}

export async function parseCpArgs(cwd: string, args: string[]): Promise<cpFlags> {
  const paths = [];
  let recursive = false;
  for (const arg of parse_arg_kinds(args)) {
    if (arg.kind === "Arg") paths.push(arg.arg);
    else if (
      (arg.arg === "recursive" && arg.kind === "LongFlag") ||
      (arg.arg === "r" && arg.kind == "ShortFlag") ||
      (arg.arg === "R" && arg.kind === "ShortFlag")
    ) {
      recursive = true;
    } else bailUnsupported(arg);
  }
  if (paths.length === 0) throw Error("missing file operand");
  else if (paths.length === 1) throw Error(`missing destination file operand after '${paths[0]}'`);

  return { recursive, operations: await getCopyAndMoveOperations(cwd, paths) };
}

async function doCopyOperation(
  flags: cpFlags,
  from: PathWithSpecified,
  to: PathWithSpecified,
) {
  // These are racy with the file system, but that's ok.
  // They only exists to give better error messages.
  if (await isDir(from.path)) {
    if (flags.recursive) {
      if (await fs.exists(to.path) && await isFile(to.path)) {
        throw Error("destination was a file");
      } else if (await isSymlink(to.path)) {
        throw Error("no support for copying to symlinks");
      } else if (await isSymlink(from.path)) {
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
    const newFrom = rustJoin(from, entry.name);
    const newTo = rustJoin(to, entry.name);
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
    return resultFromCode(0);
  } catch (err) {
    context.stderr.writeLine(`mv: ${err?.message ?? err}`);
    return resultFromCode(1);
  }
}

interface mvFlags {
  operations: { from: PathWithSpecified; to: PathWithSpecified }[];
}

async function executeMove(cwd: string, args: string[]) {
  const flags = await parseMvArgs(cwd, args);
  for (const { from, to } of flags.operations) {
    await Deno.rename(from.path, to.path);
  }
}

export async function parseMvArgs(cwd: string, args: string[]): Promise<mvFlags> {
  const paths = [];

  for (const arg of parse_arg_kinds(args)) {
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
    if (!await isDir(destination)) {
      throw Error(`target '${specified_destination}' is not a directory`);
    }
    for (const from of fromArgs) {
      const fromPath = resolvePath(cwd, from);
      const toPath = rustJoin(destination, fromPath);
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
    const toPath = await isDir(destination) ? rustJoin(destination, fromPath) : destination;
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
