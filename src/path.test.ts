import { assert, assertEquals, withTempDir } from "./deps.test.ts";
import { createPathReference } from "./path.ts";
import { path as stdPath } from "./deps.ts";

Deno.test("should get json data from file", async () => {
  await withTempDir(() => {
    createPathReference("file.txt")
      .writeJsonSync({ test: 123 });
    const data = createPathReference("file.txt").jsonSync();
    assertEquals(data, { test: 123 });
  });
});

Deno.test("join", () => {
  const path = createPathReference("src");
  const newPath = path.join("other", "test");
  assertEquals(path.toString(), "src");
  assertEquals(newPath.toString(), stdPath.join("src", "other", "test"));
});

Deno.test("resolve", () => {
  const path = createPathReference("src").resolve();
  assertEquals(path.toString(), stdPath.resolve("src"));
});

Deno.test("normalize", () => {
  const path = createPathReference("src").normalize();
  assertEquals(path.toString(), stdPath.normalize("src"));
});

Deno.test("isDir", () => {
  assert(createPathReference("src").isDir());
  assert(!createPathReference("mod.ts").isDir());
  assert(!createPathReference("nonExistent").isDir());
});

Deno.test("isFile", () => {
  assert(!createPathReference("src").isFile());
  assert(createPathReference("mod.ts").isFile());
  assert(!createPathReference("nonExistent").isFile());
});

Deno.test("isSymlink", async () => {
  await withTempDir(() => {
    const path = createPathReference("file.txt").writeTextSync("");
    const newPath = path.createAbsoluteSymlinkAtSync("test.txt");
    assert(newPath.isSymlink());
    assert(!path.isSymlink());
  });
});

Deno.test("isAbsolute", () => {
  assert(!createPathReference("src").isAbsolute());
  assert(createPathReference("src").resolve().isAbsolute());
});

Deno.test("isRelative", () => {
  assert(createPathReference("src").isRelative());
  assert(!createPathReference("src").resolve().isRelative());
});

Deno.test("stat", async () => {
  const stat1 = await createPathReference("src").stat();
  assertEquals(stat1?.isDirectory, true);
  const stat2 = await createPathReference("nonExistent").stat();
  assertEquals(stat2, undefined);

  await withTempDir(async () => {
    const dir = createPathReference("temp.txt").writeTextSync("");
    const destinationPath = await dir.createAbsoluteSymlinkAt("other.txt");
    const stat3 = await destinationPath.stat();
    assertEquals(stat3!.isFile, true);
    assertEquals(stat3!.isSymlink, false);
  });
});

Deno.test("statSync", async () => {
  const stat1 = createPathReference("src").statSync();
  assertEquals(stat1?.isDirectory, true);
  const stat2 = createPathReference("nonExistent").statSync();
  assertEquals(stat2, undefined);

  await withTempDir(() => {
    const dir = createPathReference("temp.txt").writeTextSync("");
    const destinationPath = dir.createAbsoluteSymlinkAtSync("other.txt");
    const stat3 = destinationPath.statSync();
    assertEquals(stat3!.isFile, true);
    assertEquals(stat3!.isSymlink, false);
  });
});

Deno.test("lstat", async () => {
  const stat1 = await createPathReference("src").lstat();
  assertEquals(stat1?.isDirectory, true);
  const stat2 = await createPathReference("nonExistent").lstat();
  assertEquals(stat2, undefined);

  await withTempDir(async () => {
    const dir = createPathReference("temp.txt").writeTextSync("");
    const destinationPath = await dir.createRelativeSymlinkAt("other.txt");
    const stat3 = await destinationPath.lstat();
    assertEquals(stat3!.isSymlink, true);
  });
});

Deno.test("lstatSync", async () => {
  const stat1 = createPathReference("src").lstatSync();
  assertEquals(stat1?.isDirectory, true);
  const stat2 = createPathReference("nonExistent").lstatSync();
  assertEquals(stat2, undefined);

  await withTempDir(() => {
    const dir = createPathReference("temp.txt").writeTextSync("");
    const destinationPath = dir.createRelativeSymlinkAtSync("other.txt");
    const stat3 = destinationPath.lstatSync();
    assertEquals(stat3!.isSymlink, true);
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

Deno.test("withBasename", () => {
  let path = createPathReference("src").resolve();
  path = path.join("temp", "other");
  assertEquals(path.basename(), "other");
  path = path.withBasename("test");
  assertEquals(path.basename(), "test");
  path = path.withBasename("other.asdf");
  assertEquals(path.basename(), "other.asdf");
});
