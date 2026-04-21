import type { Path } from "@david/path";
import { createTempDirSync } from "@david/temp";

/**
 * Creates a temporary directory, chdirs into it, runs the action, then
 * restores cwd and deletes the directory.
 *
 * Test-only helper — many tests use relative paths or `process.chdir(...)`
 * against the temp dir, so cwd must be set up for them.
 */
export async function withTempDir(action: (path: Path) => Promise<void> | void): Promise<void> {
  await using tempDir = usingTempDir();
  await action(tempDir);
}

/**
 * Creates a temporary directory, chdirs into it, and returns an
 * `AsyncDisposable` that restores cwd and removes the directory when
 * disposed.
 */
export function usingTempDir(): Path & AsyncDisposable {
  const originalCwd = process.cwd();
  const handle = createTempDirSync();
  process.chdir(handle.path.toString());
  const pathRef = handle.path;
  (pathRef as Path & AsyncDisposable)[Symbol.asyncDispose] = async () => {
    // restore cwd first — on Windows, rm-ing the current cwd fails with EBUSY/EPERM
    process.chdir(originalCwd);
    await handle[Symbol.asyncDispose]();
  };
  return pathRef as Path & AsyncDisposable;
}
