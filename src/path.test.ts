import { assertEquals, withTempDir } from "./deps.test.ts";
import { createPathReference } from "./path.ts";

Deno.test("should get json data from file", async () => {
  await withTempDir(() => {
    createPathReference("file.txt")
      .writeJsonSync({ test: 123 });
    const data = createPathReference("file.txt").jsonSync();
    assertEquals(data, { test: 123 });
  });
});

Deno.test("withExtname", () => {
  let path = createPathReference("src").resolve();
  path = path.join("temp", "other");
  assertEquals(path.basename(), "other");
  assertEquals(path.extname(), "");
  path = path.withExtname("test");
  assertEquals(path.basename(), "other.test");
  path = path.withExtname("test2");
  assertEquals(path.basename(), "other.test2");
  assertEquals(path.extname(), ".test2");
  path = path.withExtname(".txt");
  assertEquals(path.basename(), "other.txt");
  assertEquals(path.extname(), ".txt");
});
