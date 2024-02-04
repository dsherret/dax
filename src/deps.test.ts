import { createPath, Path } from "./path.ts";

export {
  assert,
  assertEquals,
  assertMatch,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "https://deno.land/std@0.213.0/assert/mod.ts";
export { toWritableStream } from "https://deno.land/std@0.213.0/io/to_writable_stream.ts";
export { toReadableStream } from "https://deno.land/std@0.213.0/io/to_readable_stream.ts";
export { isNode } from "https://deno.land/x/which_runtime@0.2.0/mod.ts";

/**
 * Creates a temporary directory, changes the cwd to this directory,
 * then cleans up and restores the cwd when complete.
 */
export async function withTempDir(action: (path: Path) => Promise<void> | void) {
  await using dirPath = usingTempDir();
  await action(createPath(dirPath).resolve());
}

export function usingTempDir(): Path & AsyncDisposable {
  const originalDirPath = Deno.cwd();
  const dirPath = Deno.makeTempDirSync();
  Deno.chdir(dirPath);
  const pathRef = createPath(dirPath).resolve();
  (pathRef as any)[Symbol.asyncDispose] = async () => {
    try {
      await Deno.remove(dirPath, { recursive: true });
    } catch {
      // ignore
    }
    Deno.chdir(originalDirPath);
  };
  return pathRef as Path & AsyncDisposable;
}
