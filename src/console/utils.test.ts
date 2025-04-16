import { assertEquals } from "@std/assert";
import { innerReadKeys } from "./utils.ts";
import { Keys } from "./utils.ts";

function createReader() {
  return {
    buffer: {
      buf: new Uint8Array(64),
      cursor: 0,
      watermark: 0,
    },
    /**
     * fill `p` with data from the buffer
     * @param p
     * @returns the number of bytes read
     */
    read(p: Uint8Array): Promise<number | null> {
      const len = Math.min(p.length, this.buffer.watermark - this.buffer.cursor);
      if (len === 0) {
        return Promise.resolve(null);
      }
      for (let i = 0; i < len; i++) {
        p[i] = this.buffer.buf[(this.buffer.cursor + i) % this.buffer.buf.length];
      }
      this.buffer.cursor += len;
      return Promise.resolve(len);
    },
    write(seq: Uint8Array): void {
      if (this.buffer.watermark + seq.length > this.buffer.buf.length) {
        throw new Error("Buffer overflow");
      }
      for (let i = 0; i < seq.length; i++) {
        this.buffer.buf[(this.buffer.watermark + i) % this.buffer.buf.length] = seq[i];
      }
      this.buffer.watermark += seq.length;
    },
  };
}

Deno.test("should handle controls", async () => {
  const reader = createReader();
  const gen = innerReadKeys(reader);

  reader.write(new Uint8Array([13]));
  assertEquals((await gen.next()).value, Keys.Enter);

  reader.write(new Uint8Array([32]));
  assertEquals((await gen.next()).value, Keys.Space);

  reader.write(new Uint8Array([27, 91, 65]));
  assertEquals((await gen.next()).value, Keys.Up);

  reader.write(new Uint8Array([27, 91, 66]));
  assertEquals((await gen.next()).value, Keys.Down);

  reader.write(new Uint8Array([27, 91, 67]));
  assertEquals((await gen.next()).value, Keys.Right);

  reader.write(new Uint8Array([27, 91, 68]));
  assertEquals((await gen.next()).value, Keys.Left);

  reader.write(new Uint8Array([3]));
  assertEquals((await gen.next()).done, true);
});

Deno.test("should handle text", async () => {
  const reader = createReader();
  const gen = innerReadKeys(reader);

  reader.write(new TextEncoder().encode("hello"));
  assertEquals((await gen.next()).value, "hello");

  reader.write(new TextEncoder().encode("world"));
  assertEquals((await gen.next()).value, "world");
});
