import { assertEquals, withTempDir } from "./deps.test.ts";
import * as $ from "./path.ts";

Deno.test("should get json data from file", async () => {
  await withTempDir(async () => {
    $.createPathReference("file.txt")
      .writeJsonSync({ test: 123 });
    const data = $.createPathReference("file.txt").jsonSync();
    assertEquals(data, { test: 123 });
  });
});
