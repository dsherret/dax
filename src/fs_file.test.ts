import { assertEquals, assertRejects } from "@std/assert";
import * as fs from "node:fs";
import * as path from "node:path";
import { create, open } from "./fs_file.ts";
import { withTempDir } from "./with_temp_dir.ts";

Deno.test("open: reads an existing file", async () => {
  await withTempDir(async (dir) => {
    const filePath = path.join(dir.toString(), "a.txt");
    fs.writeFileSync(filePath, "hello");
    const file = await open(filePath, { read: true });
    try {
      const buf = new Uint8Array(16);
      const n = await file.read(buf);
      assertEquals(n, 5);
      assertEquals(new TextDecoder().decode(buf.slice(0, n!)), "hello");
    } finally {
      file.close();
    }
  });
});

Deno.test("open: returns null on EOF", async () => {
  await withTempDir(async (dir) => {
    const filePath = path.join(dir.toString(), "a.txt");
    fs.writeFileSync(filePath, "");
    const file = await open(filePath, { read: true });
    try {
      const buf = new Uint8Array(16);
      const n = await file.read(buf);
      assertEquals(n, null);
    } finally {
      file.close();
    }
  });
});

Deno.test("open: write + create + truncate overwrites content", async () => {
  await withTempDir(async (dir) => {
    const filePath = path.join(dir.toString(), "a.txt");
    fs.writeFileSync(filePath, "original-contents");
    const file = await open(filePath, { write: true, create: true, truncate: true });
    try {
      await file.write(new TextEncoder().encode("new"));
    } finally {
      file.close();
    }
    assertEquals(fs.readFileSync(filePath, "utf8"), "new");
  });
});

Deno.test("open: write + create + append preserves content and appends", async () => {
  await withTempDir(async (dir) => {
    const filePath = path.join(dir.toString(), "a.txt");
    fs.writeFileSync(filePath, "original-");
    const file = await open(filePath, { write: true, create: true, append: true });
    try {
      await file.write(new TextEncoder().encode("appended"));
    } finally {
      file.close();
    }
    assertEquals(fs.readFileSync(filePath, "utf8"), "original-appended");
  });
});

Deno.test("open: missing file rejects with ENOENT", async () => {
  await withTempDir(async (dir) => {
    const filePath = path.join(dir.toString(), "nope.txt");
    const err = await assertRejects(() => open(filePath, { read: true }));
    assertEquals((err as NodeJS.ErrnoException).code, "ENOENT");
  });
});

Deno.test("create: creates a new empty file and truncates an existing one", async () => {
  await withTempDir(async (dir) => {
    const filePath = path.join(dir.toString(), "a.txt");
    fs.writeFileSync(filePath, "old-content");
    const file = await create(filePath);
    file.close();
    assertEquals(fs.readFileSync(filePath, "utf8"), "");
  });
});

Deno.test("FsFile: Symbol.dispose closes the fd", async () => {
  await withTempDir(async (dir) => {
    const filePath = path.join(dir.toString(), "a.txt");
    fs.writeFileSync(filePath, "hi");
    {
      using _file = await open(filePath, { read: true });
    }
    // if the fd leaked we'd still be able to read from it; we can't easily
    // observe that cross-platform, so just verify there was no throw from
    // the implicit close in `using`.
  });
});

Deno.test("FsFile: write + read roundtrip with a large buffer", async () => {
  await withTempDir(async (dir) => {
    const filePath = path.join(dir.toString(), "big.bin");
    // 1 MiB — large enough to reasonably expect at least one partial write
    // on some platforms, exercising the partial-write loop in FsFile.write.
    const buf = new Uint8Array(1024 * 1024);
    for (let i = 0; i < buf.length; i++) buf[i] = i & 0xff;
    const writer = await open(filePath, { write: true, create: true, truncate: true });
    try {
      const n = await writer.write(buf);
      assertEquals(n, buf.length);
    } finally {
      writer.close();
    }
    assertEquals(fs.statSync(filePath).size, buf.length);

    const reader = await open(filePath, { read: true });
    try {
      const out = new Uint8Array(buf.length);
      let offset = 0;
      while (offset < out.length) {
        const n = await reader.read(out.subarray(offset));
        if (n == null) break;
        offset += n;
      }
      assertEquals(offset, buf.length);
      // spot-check contents so we know we got the right bytes back
      assertEquals(out[0], 0);
      assertEquals(out[255], 255);
      assertEquals(out[256], 0);
      assertEquals(out[buf.length - 1], (buf.length - 1) & 0xff);
    } finally {
      reader.close();
    }
  });
});

Deno.test("FsFile: readSync returns null on EOF", async () => {
  await withTempDir(async (dir) => {
    const filePath = path.join(dir.toString(), "empty.txt");
    fs.writeFileSync(filePath, "");
    const file = await open(filePath, { read: true });
    try {
      const buf = new Uint8Array(16);
      assertEquals(file.readSync(buf), null);
    } finally {
      file.close();
    }
  });
});

Deno.test("FsFile: close is idempotent and doesn't throw on reuse", async () => {
  await withTempDir(async (dir) => {
    const filePath = path.join(dir.toString(), "a.txt");
    fs.writeFileSync(filePath, "hi");
    const file = await open(filePath, { read: true });
    file.close();
    file.close(); // second close should be a no-op, not throw
  });
});

Deno.test("FsFile: writable stream is usable", async () => {
  await withTempDir(async (dir) => {
    const filePath = path.join(dir.toString(), "a.txt");
    const file = await open(filePath, { write: true, create: true, truncate: true });
    const writer = file.writable.getWriter();
    try {
      await writer.write(new TextEncoder().encode("streamed"));
    } finally {
      writer.releaseLock();
      file.close();
    }
    assertEquals(fs.readFileSync(filePath, "utf8"), "streamed");
  });
});
