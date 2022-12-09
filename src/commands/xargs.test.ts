import { assertEquals, assertThrows } from "https://deno.land/std@0.167.0/testing/asserts.ts";
import { delimitBlanks, parseArgs } from "./xargs.ts";

Deno.test("xargs: parseArgs", () => {
  assertEquals(
    parseArgs([]),
    {
      initialArgs: [],
      delimiter: undefined,
      isNullTerminated: false,
    },
  );
  assertEquals(
    parseArgs([
      "-0",
      "echo",
      "2",
      "-d",
      "--test=3",
    ]),
    {
      initialArgs: [
        "echo",
        "2",
        "-d",
        "--test=3",
      ],
      delimiter: undefined,
      isNullTerminated: true,
    },
  );
  assertEquals(
    parseArgs([
      "-d",
      "\\n",
      "echo",
    ]),
    {
      initialArgs: ["echo"],
      delimiter: "\n",
      isNullTerminated: false,
    },
  );
  assertEquals(
    parseArgs([
      "--delimiter=5",
      "echo",
      "-d",
    ]),
    {
      initialArgs: ["echo", "-d"],
      delimiter: "5",
      isNullTerminated: false,
    },
  );
  assertThrows(
    () => parseArgs(["-d", "5", "-t"]),
    "unsupported flag: -t",
  );
  assertThrows(
    () => parseArgs(["-d", "-t"]),
    "expected delimiter argument following -d",
  );
  assertThrows(
    () => parseArgs(["--delimiter=5", "--null"]),
    "cannot specify both null and delimiter flag",
  );
});

Deno.test("xargs: should_delimit_blanks", () => {
  assertEquals(
    delimitBlanks("testing this\tout\nhere\n  \n\t\t test"),
    ["testing", "this", "out", "here", "test"],
  );
  assertEquals(
    delimitBlanks("testing 'this\tout  here  ' \"now double\""),
    ["testing", "this\tout  here  ", "now double"],
  );
  assertThrows(
    () => delimitBlanks("testing 'this\nout  here  '"),
    "unmatched quote; by default quotes are special to xargs unless you use the -0 option",
  );
});
