import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { Path } from "@david/path";

/**
 * Creates a temporary directory, changes the cwd to this directory,
 * then cleans up and restores the cwd when complete.
 */
export async function withTempDir(action: (path: Path) => Promise<void> | void) {
  await using dirPath = usingTempDir();
  await action(new Path(dirPath).resolve());
}

export function usingTempDir(): Path & AsyncDisposable {
  const originalDirPath = process.cwd();
  const dirPath = fs.mkdtempSync(path.join(os.tmpdir(), "dax-"));
  process.chdir(dirPath);
  const pathRef = new Path(dirPath).resolve();
  (pathRef as any)[Symbol.asyncDispose] = async () => {
    // restore the cwd first — on Windows, rm-ing the current cwd fails with EBUSY/EPERM
    process.chdir(originalDirPath);
    try {
      await fs.promises.rm(dirPath, { recursive: true });
    } catch {
      // ignore
    }
  };
  return pathRef as Path & AsyncDisposable;
}
