import { escapeArg } from "./command.ts";
import { assertEquals } from "./deps.test.ts";

Deno.test("escapes arg", () => {
  assertEquals(escapeArg("hello"), "hello");
  assertEquals(escapeArg(""), "''");
  assertEquals(escapeArg("'abc'"), `''"'"'abc'"'"''`);
});
