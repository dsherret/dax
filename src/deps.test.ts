import { createPathReference, PathReference } from "./path.ts";

export {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "https://deno.land/std@0.171.0/testing/asserts.ts";
export { writableStreamFromWriter } from "https://deno.land/std@0.171.0/streams/writable_stream_from_writer.ts";
export { serve } from "https://deno.land/std@0.171.0/http/server.ts";

/**
 * Creates a temporary directory, changes the cwd to this directory,
 * then cleans up and restores the cwd when complete.
 */
export async function withTempDir(action: (path: PathReference) => Promise<void> | void) {
  const originalDirPath = Deno.cwd();
  const dirPath = Deno.makeTempDirSync();
  Deno.chdir(dirPath);
  try {
    await action(createPathReference(dirPath).resolve());
  } finally {
    try {
      await Deno.remove(dirPath, { recursive: true });
    } catch {
      // ignore
    }
    Deno.chdir(originalDirPath);
  }
}
