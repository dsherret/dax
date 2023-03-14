import { assert, assertEquals, assertRejects, assertThrows, withTempDir } from "./deps.test.ts";
import { createPathRef, PathRef } from "./path.ts";
import { path as stdPath } from "./deps.ts";

Deno.test("create from path ref", () => {
  const path = createPathRef("src");
  const path2 = createPathRef(path);
  const path3 = new PathRef(path);
  assertEquals(path, path2);
  assertEquals(path.toString(), path3.toString());
});

Deno.test("custom inspect", () => {
  const path = createPathRef("src");
  assertEquals(Deno.inspect(path), 'PathRef("src")');
});

Deno.test("equals", async () => {
  const path = createPathRef("src");
  assert(path.equals(createPathRef("src")));
  assert(!path.equals(createPathRef("src2")));
  assert(path.equals(createPathRef("src").resolve()));
});

Deno.test("join", () => {
  const path = createPathRef("src");
  const newPath = path.join("other", "test");
  assertEquals(path.toString(), "src");
  assertEquals(newPath.toString(), stdPath.join("src", "other", "test"));
});

Deno.test("resolve", () => {
  const path = createPathRef("src").resolve();
  assertEquals(path.toString(), stdPath.resolve("src"));
});

Deno.test("normalize", () => {
  const path = createPathRef("src").normalize();
  assertEquals(path.toString(), stdPath.normalize("src"));
});

Deno.test("isDir", () => {
  assert(createPathRef("src").isDir());
  assert(!createPathRef("mod.ts").isDir());
  assert(!createPathRef("nonExistent").isDir());
});

Deno.test("isFile", () => {
  assert(!createPathRef("src").isFile());
  assert(createPathRef("mod.ts").isFile());
  assert(!createPathRef("nonExistent").isFile());
});

Deno.test("isSymlink", async () => {
  await withTempDir(() => {
    const file = createPathRef("file.txt").writeTextSync("");
    const symlinkFile = createPathRef("test.txt");
    symlinkFile.createSymlinkToSync(file, { kind: "absolute" });
    assert(symlinkFile.isSymlink());
    assert(!file.isSymlink());
  });
});

Deno.test("isAbsolute", () => {
  assert(!createPathRef("src").isAbsolute());
  assert(createPathRef("src").resolve().isAbsolute());
});

Deno.test("isRelative", () => {
  assert(createPathRef("src").isRelative());
  assert(!createPathRef("src").resolve().isRelative());
});

Deno.test("parent", () => {
  const parent = createPathRef("src").parent()!;
  assertEquals(parent.toString(), Deno.cwd());
  const lastParent = Array.from(parent.ancestors()).at(-1)!;
  assertEquals(lastParent.parent(), undefined);
});

Deno.test("parentOrThrow", () => {
  const parent = createPathRef("src").parentOrThrow();
  assertEquals(parent.toString(), Deno.cwd());
  const lastParent = Array.from(parent.ancestors()).at(-1)!;
  assertThrows(() => lastParent.parentOrThrow(), Error);
});

Deno.test("ancestors", () => {
  const srcDir = createPathRef("src").resolve();
  let lastDir = srcDir;
  for (const ancestor of srcDir.ancestors()) {
    assert(ancestor.toString().length < lastDir.toString().length);
    lastDir = ancestor;
  }
});

Deno.test("resolve", () => {
  // there are more tests elsewhere
  const srcDir = createPathRef("src").resolve();
  const assetsDir = srcDir.resolve("assets");
  assert(assetsDir.toString().endsWith("assets"));

  // should be the same object since it is known to be resolved
  assert(assetsDir === assetsDir.resolve());
});

Deno.test("stat", async () => {
  const stat1 = await createPathRef("src").stat();
  assertEquals(stat1?.isDirectory, true);
  const stat2 = await createPathRef("nonExistent").stat();
  assertEquals(stat2, undefined);

  await withTempDir(async () => {
    const tempFile = createPathRef("temp.txt").writeTextSync("");
    const symlinkFile = createPathRef("other.txt");
    await symlinkFile.createSymlinkTo(tempFile, { kind: "absolute" });
    const stat3 = await symlinkFile.stat();
    assertEquals(stat3!.isFile, true);
    assertEquals(stat3!.isSymlink, false);
  });
});

Deno.test("statSync", async () => {
  const stat1 = createPathRef("src").statSync();
  assertEquals(stat1?.isDirectory, true);
  const stat2 = createPathRef("nonExistent").statSync();
  assertEquals(stat2, undefined);

  await withTempDir(() => {
    const tempFile = createPathRef("temp.txt").writeTextSync("");
    const symlinkFile = createPathRef("other.txt");
    symlinkFile.createSymlinkToSync(tempFile, { kind: "absolute" });
    const stat3 = symlinkFile.statSync();
    assertEquals(stat3!.isFile, true);
    assertEquals(stat3!.isSymlink, false);
  });
});

Deno.test("lstat", async () => {
  const stat1 = await createPathRef("src").lstat();
  assertEquals(stat1?.isDirectory, true);
  const stat2 = await createPathRef("nonExistent").lstat();
  assertEquals(stat2, undefined);

  await withTempDir(async () => {
    const symlinkFile = createPathRef("temp.txt");
    const otherFile = createPathRef("other.txt").writeTextSync("");
    // path ref
    await symlinkFile.createSymlinkTo(otherFile, { kind: "absolute" });
    const stat3 = await symlinkFile.lstat();
    assertEquals(stat3!.isSymlink, true);
  });
});

Deno.test("lstatSync", async () => {
  const stat1 = createPathRef("src").lstatSync();
  assertEquals(stat1?.isDirectory, true);
  const stat2 = createPathRef("nonExistent").lstatSync();
  assertEquals(stat2, undefined);

  await withTempDir(() => {
    const symlinkFile = createPathRef("temp.txt");
    const otherFile = createPathRef("other.txt").writeTextSync("");
    symlinkFile.createSymlinkToSync(otherFile, { kind: "absolute" });
    assertEquals(symlinkFile.lstatSync()!.isSymlink, true);
  });
});

Deno.test("withExtname", () => {
  let path = createPathRef("src").resolve();
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
  let path = createPathRef("src").resolve();
  path = path.join("temp", "other");
  assertEquals(path.basename(), "other");
  path = path.withBasename("test");
  assertEquals(path.basename(), "test");
  path = path.withBasename("other.asdf");
  assertEquals(path.basename(), "other.asdf");
});

Deno.test("relative", () => {
  const path1 = createPathRef("src");
  const path2 = createPathRef(".github");
  assertEquals(
    path1.relative(path2),
    Deno.build.os === "windows" ? "..\\.github" : "../.github",
  );
});

Deno.test("exists", async () => {
  await withTempDir(async () => {
    const file = createPathRef("file");
    assert(!await file.exists());
    assert(!file.existsSync());
    file.writeTextSync("");
    assert(await file.exists());
    assert(file.existsSync());
  });
});

Deno.test("realpath", async () => {
  await withTempDir(async () => {
    let file = createPathRef("file").resolve();
    file.writeTextSync("");
    // need to do realPathSync for GH actions CI
    file = file.realPathSync();
    const symlink = createPathRef("other");
    symlink.createSymlinkToSync(file, { kind: "absolute" });
    assertEquals(
      (await symlink.realPath()).toString(),
      file.toString(),
    );
    assertEquals(
      symlink.realPathSync().toString(),
      file.toString(),
    );
  });
});

Deno.test("mkdir", async () => {
  await withTempDir(async () => {
    const path = createPathRef("dir");
    await path.mkdir();
    assert(path.isDir());
    path.removeSync();
    assert(!path.isDir());
    path.mkdirSync();
    assert(path.isDir());
    const nestedDir = path.join("subdir", "subsubdir", "sub");
    await assertRejects(() => nestedDir.mkdir({ recursive: false }));
    assertThrows(() => nestedDir.mkdirSync({ recursive: false }));
    assert(!nestedDir.parentOrThrow().existsSync());
    await nestedDir.mkdir();
    assert(nestedDir.existsSync());
    await path.remove({ recursive: true });
    assert(!path.existsSync());
    nestedDir.mkdirSync();
    assert(nestedDir.existsSync());
  });
});

Deno.test("createSymlinkTo", async () => {
  await withTempDir(async () => {
    const destFile = createPathRef("temp.txt").writeTextSync("");
    const symlinkFile = destFile.parentOrThrow().join("other.txt");
    await symlinkFile.createSymlinkTo(destFile, {
      kind: "absolute",
    });
    const stat = await symlinkFile.stat();
    assertEquals(stat!.isFile, true);
    assertEquals(stat!.isSymlink, false);
    assert(symlinkFile.isSymlink());

    // invalid
    await assertRejects(
      async () => {
        // @ts-expect-error should require an options bag
        await symlinkFile.createSymlinkTo(destFile);
      },
      Error,
      "Please specify if this symlink is absolute or relative. Otherwise provide the target text.",
    );
  });
});

Deno.test("createSymlinkToSync", async () => {
  await withTempDir(() => {
    const destFile = createPathRef("temp.txt").writeTextSync("");
    const symlinkFile = destFile.parentOrThrow().join("other.txt");

    // path ref
    symlinkFile.createSymlinkToSync(destFile, { kind: "absolute" });
    const stat = symlinkFile.statSync();
    assertEquals(stat!.isFile, true);
    assertEquals(stat!.isSymlink, false);
    assert(symlinkFile.isSymlink());

    // path ref absolute
    symlinkFile.removeSync();
    symlinkFile.createSymlinkToSync(destFile, { kind: "absolute" });
    assertEquals(symlinkFile.statSync()!.isFile, true);

    // path ref relative
    symlinkFile.removeSync();
    symlinkFile.createSymlinkToSync(destFile, { kind: "relative" });
    assertEquals(symlinkFile.statSync()!.isFile, true);

    // relative text
    symlinkFile.removeSync();
    symlinkFile.createSymlinkToSync("temp.txt");
    assertEquals(symlinkFile.statSync()!.isFile, true);

    // invalid
    assertThrows(
      () => {
        // @ts-expect-error should require an options bag
        symlinkFile.createSymlinkToSync(destFile);
      },
      Error,
      "Please specify if this symlink is absolute or relative. Otherwise provide the target text.",
    );
  });
});

Deno.test("readDir", async () => {
  await withTempDir(async () => {
    const dir = createPathRef(".").resolve();
    dir.join("file1").writeTextSync("");
    dir.join("file2").writeTextSync("");

    const entries1 = [];
    for await (const entry of dir.readDir()) {
      entries1.push(entry);
    }
    const entries2 = Array.from(dir.readDirSync());
    entries1.sort((a, b) => a.name.localeCompare(b.name));
    entries2.sort((a, b) => a.name.localeCompare(b.name));

    for (const entries of [entries1, entries2]) {
      assertEquals(entries.length, 2);
      assertEquals(entries[0].name, "file1");
      assertEquals(entries[1].name, "file2");
    }

    const filePaths1 = [];
    for await (const path of dir.readDirFilePaths()) {
      filePaths1.push(path.toString());
    }
    const filePaths2 = Array.from(dir.readDirFilePathsSync()).map((p) => p.toString());
    filePaths1.sort();
    filePaths2.sort();
    assertEquals(filePaths1, filePaths2);
    assertEquals(filePaths1, entries1.map((entry) => entry.path.toString()));
    assertEquals(filePaths1, entries2.map((entry) => entry.path.toString()));
  });
});

Deno.test("expandGlob", async () => {
  await withTempDir(async () => {
    const dir = createPathRef(".").resolve();
    dir.join("file1").writeTextSync("");
    dir.join("file2").writeTextSync("");
    const subDir = dir.join("dir").join("subDir");
    subDir.join("file.txt").writeTextSync("");

    const entries1 = [];
    for await (const entry of dir.expandGlob("**/*.txt")) {
      entries1.push(entry.path);
    }
    const entries2 = Array.from(dir.expandGlobSync("**/*.txt")).map((e) => e.path);

    assertEquals(entries1, entries2);

    assertEquals(entries1.length, 1);
    assertEquals(entries1[0].basename(), "file.txt");

    const subDir2 = dir.join("dir2");
    subDir2.join("other.txt").writeTextSync("");
    const entries3 = Array.from(subDir2.expandGlobSync("**/*.txt")).map((e) => e.path);
    assertEquals(entries3.length, 1);
    assertEquals(entries3[0].basename(), "other.txt");
  });
});

Deno.test("readBytes", async () => {
  await withTempDir(async () => {
    const file = createPathRef("file.txt");
    const bytes = new TextEncoder().encode("asdf");
    file.writeSync(bytes);
    assertEquals(file.readBytesSync(), bytes);
    assertEquals(await file.readBytes(), bytes);
    const nonExistent = createPathRef("not-exists");
    assertThrows(() => nonExistent.readBytesSync());
    await assertRejects(() => nonExistent.readBytes());
  });
});

Deno.test("readMaybeBytes", async () => {
  await withTempDir(async () => {
    const file = createPathRef("file.txt");
    const bytes = new TextEncoder().encode("asdf");
    await file.write(bytes);
    assertEquals(file.readMaybeBytesSync(), bytes);
    assertEquals(await file.readMaybeBytes(), bytes);
    const nonExistent = createPathRef("not-exists");
    assertEquals(await nonExistent.readMaybeText(), undefined);
    assertEquals(nonExistent.readMaybeTextSync(), undefined);
  });
});

Deno.test("readText", async () => {
  await withTempDir(async () => {
    const file = createPathRef("file.txt");
    file.writeTextSync("asdf");
    assertEquals(file.readMaybeTextSync(), "asdf");
    assertEquals(await file.readMaybeText(), "asdf");
    const nonExistent = createPathRef("not-exists");
    assertThrows(() => nonExistent.readTextSync());
    await assertRejects(() => nonExistent.readText());
  });
});

Deno.test("readMaybeText", async () => {
  await withTempDir(async () => {
    const file = createPathRef("file.txt");
    file.writeTextSync("asdf");
    assertEquals(file.readMaybeTextSync(), "asdf");
    assertEquals(await file.readMaybeText(), "asdf");
    const nonExistent = createPathRef("not-exists");
    assertEquals(await nonExistent.readMaybeText(), undefined);
    assertEquals(nonExistent.readMaybeTextSync(), undefined);
  });
});

Deno.test("readJson", async () => {
  await withTempDir(async () => {
    const file = createPathRef("file.txt");
    file.writeJsonSync({ test: 123 });
    let data = file.readJsonSync();
    assertEquals(data, { test: 123 });
    data = await file.readJson();
    assertEquals(data, { test: 123 });
  });
});

Deno.test("readMaybeJson", async () => {
  await withTempDir(async () => {
    const file = createPathRef("file.json");
    file.writeJsonSync({ test: 123 });
    let data = file.readMaybeJsonSync();
    assertEquals(data, { test: 123 });
    data = await file.readMaybeJson();
    assertEquals(data, { test: 123 });
    const nonExistent = createPathRef("not-exists");
    data = nonExistent.readMaybeJsonSync();
    assertEquals(data, undefined);
    data = await nonExistent.readMaybeJson();
    assertEquals(data, undefined);

    file.writeTextSync("1 23 532lkjladf asd");
    assertThrows(() => file.readMaybeJsonSync(), Error, "Failed parsing JSON in 'file.json'.");
    await assertRejects(() => file.readMaybeJson(), Error, "Failed parsing JSON in 'file.json'.");
  });
});

Deno.test("write", async () => {
  await withTempDir(async (dir) => {
    // these should all handle creating the directory when it doesn't exist
    const file1 = dir.join("subDir1/file.txt");
    const file2 = dir.join("subDir2/file.txt");
    const file3 = dir.join("subDir3/file.txt");
    const file4 = dir.join("subDir4/file.txt");

    await file1.writeText("test");
    assertEquals(file1.readTextSync(), "test");

    file2.writeTextSync("test");
    assertEquals(file2.readTextSync(), "test");

    await file3.write(new TextEncoder().encode("test"));
    assertEquals(file3.readTextSync(), "test");

    file4.writeSync(new TextEncoder().encode("test"));
    assertEquals(file4.readTextSync(), "test");

    // writing on top of a file it should return the original not found error
    const fileOnFile = file1.join("fileOnFile");
    // windows will throw a NotFound error
    const errorClass = Deno.build.os === "windows" ? Deno.errors.NotFound : Error;
    await assertRejects(() => fileOnFile.writeText("asdf"), errorClass);
    assertThrows(() => fileOnFile.writeTextSync("asdf"), errorClass);
  });
});

Deno.test("writeJson", async () => {
  await withTempDir(async () => {
    const path = createPathRef("file.json");
    await path.writeJson({
      prop: "test",
    });
    assertEquals(path.readTextSync(), `{"prop":"test"}\n`);
    await path.writeJson({
      prop: 1,
    });
    // should truncate
    assertEquals(path.readTextSync(), `{"prop":1}\n`);

    path.writeJsonSync({
      asdf: "test",
    });
    assertEquals(path.readTextSync(), `{"asdf":"test"}\n`);
    path.writeJsonSync({
      asdf: 1,
    });
    // should truncate
    assertEquals(path.readTextSync(), `{"asdf":1}\n`);
  });
});

Deno.test("writeJsonPretty", async () => {
  await withTempDir(async () => {
    const path = createPathRef("file.json");
    await path.writeJsonPretty({
      prop: "test",
    });
    assertEquals(path.readTextSync(), `{\n  "prop": "test"\n}\n`);
    await path.writeJsonPretty({
      prop: 1,
    });
    // should truncate
    assertEquals(path.readTextSync(), `{\n  "prop": 1\n}\n`);

    path.writeJsonPrettySync({
      asdf: "test",
    });
    assertEquals(path.readTextSync(), `{\n  "asdf": "test"\n}\n`);
    path.writeJsonPrettySync({
      asdf: 1,
    });
    // should truncate
    assertEquals(path.readTextSync(), `{\n  "asdf": 1\n}\n`);
  });
});

Deno.test("create", async () => {
  await withTempDir(async () => {
    const path = createPathRef("file.txt").writeTextSync("text");
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
    const path = createPathRef("file.txt").writeTextSync("text");
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
    const path = createPathRef("file.txt").writeTextSync("text");
    let file = await path.open({ write: true });
    await file.writeText("1");
    file.writeTextSync("2");
    file.close();
    file = path.openSync({ write: true, append: true });
    await file.writeBytes(new TextEncoder().encode("3"));
    file.close();
    assertEquals(path.readTextSync(), "12xt3");
  });
});

Deno.test("remove", async () => {
  await withTempDir(async () => {
    const path = createPathRef("file.txt").writeTextSync("text");
    assert(path.existsSync());
    assert(!path.removeSync().existsSync());
    path.writeTextSync("asdf");
    assert(path.existsSync());
    assert(!(await path.remove()).existsSync());
  });
});

Deno.test("copyFile", async () => {
  await withTempDir(async () => {
    const path = createPathRef("file.txt").writeTextSync("text");
    const newPath = await path.copyFile("other.txt");
    assert(path.existsSync());
    assert(newPath.existsSync());
    assertEquals(newPath.readTextSync(), "text");
    const newPath2 = path.copyFileSync("other2.txt");
    assert(newPath2.existsSync());
    assertEquals(newPath2.readTextSync(), "text");
  });
});

Deno.test("rename", async () => {
  await withTempDir(async () => {
    const path = createPathRef("file.txt").writeTextSync("");
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
    const textFile = createPathRef("file.txt").writeTextSync(largeText);
    const otherFilePath = textFile.parentOrThrow().join("other.txt");
    const otherFile = otherFilePath.openSync({ write: true, create: true });
    await textFile.pipeTo(otherFile.writable);
    assertEquals(otherFilePath.readTextSync(), largeText);
  });
});

Deno.test("instanceof check", () => {
  class OtherPathRef {
    // should match because of this
    private static instanceofSymbol = Symbol.for("dax.PathRef");

    static [Symbol.hasInstance](instance: any) {
      return instance?.constructor?.instanceofSymbol === OtherPathRef.instanceofSymbol;
    }
  }

  assert(createPathRef("test") instanceof PathRef);
  assert(!(new URL("https://example.com") instanceof PathRef));
  assert(new OtherPathRef() instanceof PathRef);
  assert(createPathRef("test") instanceof OtherPathRef);
});

Deno.test("toFileUrl", () => {
  const path = createPathRef(import.meta);
  assertEquals(path.toString(), stdPath.fromFileUrl(import.meta.url));
  assertEquals(path.toFileUrl(), new URL(import.meta.url));
});
