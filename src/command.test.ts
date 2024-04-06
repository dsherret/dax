import { assertEquals } from "@std/assert";
import { escapeArg } from "./command.ts";

Deno.test("escapes arg", () => {
  assertEquals(escapeArg("hello"), "hello");
  assertEquals(escapeArg(""), "''");
  assertEquals(escapeArg("'abc'"), `''"'"'abc'"'"''`);
});
