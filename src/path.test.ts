import { assert, assertEquals, assertRejects, assertThrows, withTempDir } from "./deps.test.ts";
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

Deno.test("parent", () => {
  const parent = createPathReference("src").parent()!;
  assertEquals(parent.toString(), Deno.cwd());
  const lastParent = Array.from(parent.ancestors()).at(-1)!;
  assertEquals(lastParent.parent(), undefined);
});

Deno.test("parentOrThrow", () => {
  const parent = createPathReference("src").parentOrThrow();
  assertEquals(parent.toString(), Deno.cwd());
  const lastParent = Array.from(parent.ancestors()).at(-1)!;
  assertThrows(() => lastParent.parentOrThrow(), Error);
});

Deno.test("ancestors", () => {
  const srcDir = createPathReference("src").resolve();
  let lastDir = srcDir;
  for (const ancestor of srcDir.ancestors()) {
    assert(ancestor.toString().length < lastDir.toString().length);
    lastDir = ancestor;
  }
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
  assertEquals(path.extname(), undefined);
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

Deno.test("writeJson", async () => {
  await withTempDir(async () => {
    const path = createPathReference("file.json");
    await path.writeJson({
      prop: "test",
    });
    assertEquals(path.textSync(), `{"prop":"test"}\n`);
    await path.writeJson({
      prop: 1,
    });
    // should truncate
    assertEquals(path.textSync(), `{"prop":1}\n`);

    path.writeJsonSync({
      asdf: "test",
    });
    assertEquals(path.textSync(), `{"asdf":"test"}\n`);
    path.writeJsonSync({
      asdf: 1,
    });
    // should truncate
    assertEquals(path.textSync(), `{"asdf":1}\n`);
  });
});

Deno.test("writeJsonPretty", async () => {
  await withTempDir(async () => {
    const path = createPathReference("file.json");
    await path.writeJsonPretty({
      prop: "test",
    });
    assertEquals(path.textSync(), `{\n  "prop": "test"\n}\n`);
    await path.writeJsonPretty({
      prop: 1,
    });
    // should truncate
    assertEquals(path.textSync(), `{\n  "prop": 1\n}\n`);

    path.writeJsonPrettySync({
      asdf: "test",
    });
    assertEquals(path.textSync(), `{\n  "asdf": "test"\n}\n`);
    path.writeJsonPrettySync({
      asdf: 1,
    });
    // should truncate
    assertEquals(path.textSync(), `{\n  "asdf": 1\n}\n`);
  });
});

Deno.test("create", async () => {
  await withTempDir(async () => {
    const path = createPathReference("file.txt").writeTextSync("text");
    let file = await path.create();
    file.writeTextSync("asdf");
    file.close();
    path.removeSync();
    file = await path.create();
    file.close();
    file = path.createSync();
    file.writeTextSync("asdf");
    file.close();
    path.removeSync();
    file = path.createSync();
    file.close();
  });
});

Deno.test("createNew", async () => {
  await withTempDir(async () => {
    const path = createPathReference("file.txt").writeTextSync("text");
    await assertRejects(() => path.createNew());
    path.removeSync();
    let file = await path.createNew();
    file.close();
    assertThrows(() => path.createNewSync());
    path.removeSync();
    file = path.createNewSync();
    file.close();
  });
});

Deno.test("open", async () => {
  await withTempDir(async () => {
    const path = createPathReference("file.txt").writeTextSync("text");
    let file = await path.open({ write: true });
    await file.writeText("1");
    file.writeTextSync("2");
    file.close();
    file = path.openSync({ write: true, append: true });
    await file.writeBytes(new TextEncoder().encode("3"));
    file.close();
    assertEquals(path.textSync(), "12xt3");
  });
});

Deno.test("remove", async () => {
  await withTempDir(async () => {
    const path = createPathReference("file.txt").writeTextSync("text");
    assert(path.existsSync());
    assert(!path.removeSync().existsSync());
    path.writeTextSync("asdf");
    assert(path.existsSync());
    assert(!(await path.remove()).existsSync());
  });
});

Deno.test("copyFile", async () => {
  await withTempDir(async () => {
    const path = createPathReference("file.txt").writeTextSync("text");
    const newPath = await path.copyFile("other.txt");
    assert(path.existsSync());
    assert(newPath.existsSync());
    assertEquals(newPath.textSync(), "text");
    const newPath2 = path.copyFileSync("other2.txt");
    assert(newPath2.existsSync());
    assertEquals(newPath2.textSync(), "text");
  });
});

Deno.test("rename", async () => {
  await withTempDir(async () => {
    const path = createPathReference("file.txt").writeTextSync("");
    const newPath = path.renameSync("other.txt");
    assert(!path.existsSync());
    assert(newPath.existsSync());
    path.writeTextSync("");
    const newPath2 = await path.rename("other2.txt");
    assert(!path.existsSync());
    assert(newPath2.existsSync());
  });
});

Deno.test("pipeTo", async () => {
  await withTempDir(async () => {
    const largeText = "asdf".repeat(100_000);
    const textFile = createPathReference("file.txt").writeTextSync(largeText);
    const otherFilePath = textFile.parentOrThrow().join("other.txt");
    const otherFile = otherFilePath.openSync({ write: true, create: true });
    await textFile.pipeTo(otherFile.writable);
    assertEquals(otherFilePath.textSync(), largeText);
  });
});
