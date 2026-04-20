import { Path } from "@david/path";
import * as compat from "./compat.ts";

/**
 * Creates a temporary directory, changes the cwd to this directory,
 * then cleans up and restores the cwd when complete.
 */
export async function withTempDir(action: (path: Path) => Promise<void> | void) {
  await using dirPath = usingTempDir();
  await action(new Path(dirPath).resolve());
}

export function usingTempDir(): Path & AsyncDisposable {
  const originalDirPath = compat.cwd();
  const dirPath = compat.makeTempDirSync();
  compat.chdir(dirPath);
  const pathRef = new Path(dirPath).resolve();
  (pathRef as any)[Symbol.asyncDispose] = async () => {
    try {
      await compat.remove(dirPath, { recursive: true });
    } catch {
      // ignore
    }
    compat.chdir(originalDirPath);
  };
  return pathRef as Path & AsyncDisposable;
}
