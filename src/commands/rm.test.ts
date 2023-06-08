import { assertEquals, assertThrows } from "$std/testing/asserts.ts";
import { parseArgs } from "./rm.ts";

Deno.test("parse rm arguments", () => {
  assertEquals(
    parseArgs([
      "--recursive",
      "--dir",
      "a",
      "b",
    ]),
    {
      force: false,
      recursive: true,
      dir: true,
      paths: ["a", "b"],
    },
  );
  assertEquals(
    parseArgs(["-rf", "a", "b"]),
    {
      recursive: true,
      force: true,
      dir: false,
      paths: ["a", "b"],
    },
  );
  assertEquals(
    parseArgs(["-d", "a"]),
    {
      recursive: false,
      force: false,
      dir: true,
      paths: ["a"],
    },
  );
  assertThrows(
    () => parseArgs(["--recursive", "-f"]),
    Error,
    "missing operand",
  );
  assertThrows(
    () =>
      parseArgs([
        "--recursive",
        "-u",
        "a",
      ]),
    Error,
    "unsupported flag: -u",
  );
  assertThrows(
    () =>
      parseArgs([
        "--recursive",
        "--random-flag",
        "a",
      ]),
    Error,
    "unsupported flag: --random-flag",
  );
});
