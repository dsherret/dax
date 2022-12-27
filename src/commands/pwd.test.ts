import { assert, assertEquals, assertThrows } from "../deps.test.ts";
import { parseArgs } from "./pwd.ts";

Deno.test("pwd: parseArgs", () => {
  assertEquals(parseArgs([]), { logical: false });
  assertEquals(
    parseArgs(["-P"]),
    { logical: false },
  );
  assertEquals(
    parseArgs(["-L"]),
    { logical: true },
  );
  assert(parseArgs(["test"]));
  assertThrows(
    () => parseArgs(["--flag"]),
    Error,
    "unsupported flag: --flag",
  );
  assertThrows(
    () => parseArgs(["-t"]),
    Error,
    "unsupported flag: -t",
  );
});
