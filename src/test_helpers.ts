import $, { PathRef } from "../mod.ts";
/**
 * Creates a temporary directory, changes the cwd to this directory,
 * then cleans up and restores the cwd when complete.
 */
export async function withTempDir(action: (path: PathRef) => Promise<void> | void) {
  const originalDirPath = Deno.cwd();
  const dirPath = Deno.makeTempDirSync();
  Deno.chdir(dirPath);
  try {
    await action($.path(dirPath).resolve());
  } finally {
    try {
      await Deno.remove(dirPath, { recursive: true });
    } catch {
      // ignore
    }
    Deno.chdir(originalDirPath);
  }
}
