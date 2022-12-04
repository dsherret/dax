import { assertEquals, assertThrows } from "../deps.test.ts";
import { parseArgs } from "./mkdir.ts";

Deno.test("test mkdir parse args", () => {
  assertEquals(
    parseArgs([
      "--parents",
      "a",
      "b",
    ]),
    {
      parents: true,
      paths: ["a", "b"],
    },
  );
  assertEquals(
    parseArgs(["-p", "a", "b"]),
    {
      parents: true,
      paths: ["a", "b"],
    },
  );
  assertThrows(
    () => parseArgs(["--parents"]),
    Error,
    "missing operand",
  );
  assertThrows(
    () =>
      parseArgs([
        "--parents",
        "-p",
        "-u",
        "a",
      ]),
    Error,
    "unsupported flag: -u",
  );
  assertThrows(
    () =>
      parseArgs([
        "--parents",
        "--random-flag",
        "a",
      ]),
    Error,
    "unsupported flag: --random-flag",
  );
});
