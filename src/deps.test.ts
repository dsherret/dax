export {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "https://deno.land/std@0.171.0/testing/asserts.ts";
export { writableStreamFromWriter } from "https://deno.land/std@0.171.0/streams/writable_stream_from_writer.ts";
export { serve } from "https://deno.land/std@0.171.0/http/server.ts";

export async function withTempDir(action: (path: string) => Promise<void>) {
  const originalDirPath = Deno.cwd();
  const dirPath = Deno.makeTempDirSync();
  Deno.chdir(dirPath);
  try {
    await action(dirPath);
  } finally {
    try {
      await Deno.remove(dirPath, { recursive: true });
    } catch {
      // ignore
    }
    Deno.chdir(originalDirPath);
  }
}
