import { assertEquals } from "@std/assert";
import * as fs from "node:fs";
import * as path from "node:path";
import { expandGlob } from "./glob.ts";
import { withTempDir } from "./with_temp_dir.ts";

async function collect(pattern: string, root: string) {
  const result: string[] = [];
  for await (const entry of expandGlob(pattern, { root, caseInsensitive: false })) {
    result.push(path.relative(root, entry.path).split(path.sep).join("/"));
  }
  return result.sort();
}

Deno.test("expandGlob: literal filename matches", async () => {
  await withTempDir(async (dir) => {
    const root = dir.toString();
    fs.writeFileSync(path.join(root, "a.txt"), "");
    fs.writeFileSync(path.join(root, "b.txt"), "");
    assertEquals(await collect("a.txt", root), ["a.txt"]);
  });
});

Deno.test("expandGlob: star matches within a segment", async () => {
  await withTempDir(async (dir) => {
    const root = dir.toString();
    fs.writeFileSync(path.join(root, "a.txt"), "");
    fs.writeFileSync(path.join(root, "b.txt"), "");
    fs.writeFileSync(path.join(root, "a.md"), "");
    assertEquals(await collect("*.txt", root), ["a.txt", "b.txt"]);
  });
});

Deno.test("expandGlob: star does not cross directory boundaries", async () => {
  await withTempDir(async (dir) => {
    const root = dir.toString();
    fs.mkdirSync(path.join(root, "sub"));
    fs.writeFileSync(path.join(root, "sub", "a.txt"), "");
    fs.writeFileSync(path.join(root, "top.txt"), "");
    assertEquals(await collect("*.txt", root), ["top.txt"]);
  });
});

Deno.test("expandGlob: question mark matches a single char", async () => {
  await withTempDir(async (dir) => {
    const root = dir.toString();
    fs.writeFileSync(path.join(root, "a.txt"), "");
    fs.writeFileSync(path.join(root, "ab.txt"), "");
    assertEquals(await collect("?.txt", root), ["a.txt"]);
  });
});

Deno.test("expandGlob: character class range", async () => {
  await withTempDir(async (dir) => {
    const root = dir.toString();
    fs.writeFileSync(path.join(root, "a.txt"), "");
    fs.writeFileSync(path.join(root, "b.txt"), "");
    fs.writeFileSync(path.join(root, "z.txt"), "");
    fs.writeFileSync(path.join(root, "1.txt"), "");
    assertEquals(await collect("[a-c].txt", root), ["a.txt", "b.txt"]);
  });
});

Deno.test("expandGlob: character class negation", async () => {
  await withTempDir(async (dir) => {
    const root = dir.toString();
    fs.writeFileSync(path.join(root, "a.txt"), "");
    fs.writeFileSync(path.join(root, "1.txt"), "");
    fs.writeFileSync(path.join(root, "2.txt"), "");
    assertEquals(await collect("[!a-z].txt", root), ["1.txt", "2.txt"]);
  });
});

Deno.test("expandGlob: globstar recurses across directories", async () => {
  await withTempDir(async (dir) => {
    const root = dir.toString();
    fs.mkdirSync(path.join(root, "a", "b"), { recursive: true });
    fs.writeFileSync(path.join(root, "1.txt"), "");
    fs.writeFileSync(path.join(root, "a", "2.txt"), "");
    fs.writeFileSync(path.join(root, "a", "b", "3.txt"), "");
    assertEquals(await collect("**/*.txt", root), ["1.txt", "a/2.txt", "a/b/3.txt"]);
  });
});

Deno.test("expandGlob: globstar is treated as star when disabled", async () => {
  await withTempDir(async (dir) => {
    const root = dir.toString();
    fs.mkdirSync(path.join(root, "a", "b"), { recursive: true });
    fs.writeFileSync(path.join(root, "1.txt"), "");
    fs.writeFileSync(path.join(root, "a", "2.txt"), "");
    fs.writeFileSync(path.join(root, "a", "b", "3.txt"), "");
    const result: string[] = [];
    for await (const entry of expandGlob("**/*.txt", { root, globstar: false })) {
      result.push(path.relative(root, entry.path).split(path.sep).join("/"));
    }
    // `**` behaves like `*` — matches a single directory level
    assertEquals(result.sort(), ["a/2.txt"]);
  });
});

Deno.test("expandGlob: case-insensitive matching via regex", async () => {
  await withTempDir(async (dir) => {
    const root = dir.toString();
    fs.writeFileSync(path.join(root, "A.TXT"), "");
    fs.writeFileSync(path.join(root, "b.txt"), "");
    const result: string[] = [];
    for await (const entry of expandGlob("*.txt", { root, caseInsensitive: true })) {
      result.push(path.relative(root, entry.path).split(path.sep).join("/"));
    }
    assertEquals(result.sort(), ["A.TXT", "b.txt"]);
  });
});

Deno.test("expandGlob: no match yields nothing", async () => {
  await withTempDir(async (dir) => {
    const root = dir.toString();
    fs.writeFileSync(path.join(root, "a.txt"), "");
    assertEquals(await collect("*.md", root), []);
  });
});

Deno.test("expandGlob: missing root directory yields nothing", async () => {
  await withTempDir(async (dir) => {
    const root = path.join(dir.toString(), "does-not-exist");
    assertEquals(await collect("*", root), []);
  });
});

Deno.test("expandGlob: excludes directories when includeDirs is false", async () => {
  await withTempDir(async (dir) => {
    const root = dir.toString();
    fs.mkdirSync(path.join(root, "sub"));
    fs.writeFileSync(path.join(root, "file.txt"), "");
    const result: string[] = [];
    for await (const entry of expandGlob("*", { root, includeDirs: false })) {
      result.push(path.relative(root, entry.path).split(path.sep).join("/"));
    }
    assertEquals(result.sort(), ["file.txt"]);
  });
});

Deno.test("expandGlob: multi-segment literal descends through directories", async () => {
  await withTempDir(async (dir) => {
    const root = dir.toString();
    fs.mkdirSync(path.join(root, "a", "b"), { recursive: true });
    fs.writeFileSync(path.join(root, "a", "b", "c.txt"), "");
    fs.writeFileSync(path.join(root, "a", "other.txt"), "");
    assertEquals(await collect("a/b/c.txt", root), ["a/b/c.txt"]);
  });
});

Deno.test("expandGlob: mid-path glob segment", async () => {
  await withTempDir(async (dir) => {
    const root = dir.toString();
    fs.mkdirSync(path.join(root, "x"), { recursive: true });
    fs.mkdirSync(path.join(root, "y"), { recursive: true });
    fs.mkdirSync(path.join(root, "z"), { recursive: true });
    fs.writeFileSync(path.join(root, "x", "file.txt"), "");
    fs.writeFileSync(path.join(root, "y", "file.txt"), "");
    fs.writeFileSync(path.join(root, "z", "other.md"), "");
    assertEquals(await collect("*/file.txt", root), ["x/file.txt", "y/file.txt"]);
  });
});

Deno.test("expandGlob: absolute pattern resolves against filesystem root", async () => {
  await withTempDir(async (dir) => {
    const root = dir.toString();
    fs.writeFileSync(path.join(root, "abs.txt"), "");
    // root-ignoring option value — the pattern is absolute, so `root` is unused
    const pattern = path.join(root, "abs.txt");
    const result: string[] = [];
    for await (const entry of expandGlob(pattern, { root: "/nonexistent-root" })) {
      result.push(entry.path);
    }
    assertEquals(result, [path.join(root, "abs.txt")]);
  });
});

Deno.test("expandGlob: absolute pattern with glob segment", async () => {
  await withTempDir(async (dir) => {
    const root = dir.toString();
    fs.writeFileSync(path.join(root, "a.txt"), "");
    fs.writeFileSync(path.join(root, "b.txt"), "");
    const pattern = path.join(root, "*.txt");
    const result: string[] = [];
    for await (const entry of expandGlob(pattern, { root: "/nonexistent-root" })) {
      result.push(path.relative(root, entry.path).split(path.sep).join("/"));
    }
    assertEquals(result.sort(), ["a.txt", "b.txt"]);
  });
});

Deno.test("expandGlob: literal missing intermediate directory yields nothing", async () => {
  await withTempDir(async (dir) => {
    const root = dir.toString();
    fs.writeFileSync(path.join(root, "a.txt"), "");
    assertEquals(await collect("missing/a.txt", root), []);
  });
});

Deno.test("expandGlob: `**/*` yields files and dirs recursively", async () => {
  await withTempDir(async (dir) => {
    const root = dir.toString();
    fs.mkdirSync(path.join(root, "a", "b"), { recursive: true });
    fs.writeFileSync(path.join(root, "a", "f.txt"), "");
    fs.writeFileSync(path.join(root, "a", "b", "g.txt"), "");
    assertEquals(
      await collect("**/*", root),
      ["a", "a/b", "a/b/g.txt", "a/f.txt"],
    );
  });
});

Deno.test("expandGlob: unmatched `[` is treated as a literal", async () => {
  await withTempDir(async (dir) => {
    const root = dir.toString();
    // on Windows `[` is permitted in filenames; skip there to keep the test portable
    if (process.platform === "win32") return;
    fs.writeFileSync(path.join(root, "[a.txt"), "");
    fs.writeFileSync(path.join(root, "b.txt"), "");
    assertEquals(await collect("[a.txt", root), ["[a.txt"]);
  });
});

Deno.test("expandGlob: leading `./` is treated the same as no prefix", async () => {
  await withTempDir(async (dir) => {
    const root = dir.toString();
    fs.writeFileSync(path.join(root, "a.txt"), "");
    assertEquals(await collect("./a.txt", root), ["a.txt"]);
  });
});

Deno.test("expandGlob: escape character makes a glob char literal", async () => {
  await withTempDir(async (dir) => {
    const root = dir.toString();
    fs.writeFileSync(path.join(root, "a.txt"), "");
    fs.writeFileSync(path.join(root, "[a].txt"), "");
    const escape = process.platform === "win32" ? "`" : "\\";
    // should match only the file literally named "[a].txt"
    assertEquals(await collect(`${escape}[a${escape}].txt`, root), ["[a].txt"]);
  });
});
