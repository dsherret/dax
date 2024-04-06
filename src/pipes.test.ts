import { assertEquals } from "@std/assert";
import { Buffer } from "@std/io/buffer";
import { InheritStaticTextBypassWriter } from "./pipes.ts";

Deno.test("should line buffer the inherit static text bypass writer", () => {
  const buffer = new Buffer();
  const writer = new InheritStaticTextBypassWriter(buffer);
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  writer.writeSync(encoder.encode("1"));
  assertEquals(decoder.decode(buffer.bytes()), "");
  writer.writeSync(encoder.encode("\r\n2"));
  assertEquals(decoder.decode(buffer.bytes()), "1\r\n");
  writer.writeSync(encoder.encode("3"));
  writer.writeSync(encoder.encode("4"));
  assertEquals(decoder.decode(buffer.bytes()), "1\r\n");
  writer.writeSync(encoder.encode("\n"));
  assertEquals(decoder.decode(buffer.bytes()), "1\r\n234\n");
  writer.writeSync(encoder.encode("5"));
  writer.flush();
  assertEquals(decoder.decode(buffer.bytes()), "1\r\n234\n5");
});
