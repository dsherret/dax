import { assertEquals } from "./deps.test.ts";
import { parseArgsOld } from "./shell.ts";

Deno.test("should parse args", () => {
  assertEquals(parseArgsOld("some command"), ["some", "command"]);
  assertEquals(parseArgsOld("  some    command   "), ["some", "command"]);
  assertEquals(parseArgsOld("test 'this is a test' test"), [
    "test",
    "this is a test",
    "test",
  ]);
  assertEquals(parseArgsOld(`test "this is a test" test`), [
    "test",
    "this is a test",
    "test",
  ]);
  assertEquals(parseArgsOld(`test "thi's \\"is a test" test`), [
    "test",
    `thi's "is a test`,
    "test",
  ]);
});
