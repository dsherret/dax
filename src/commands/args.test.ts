import { assertEquals } from "https://deno.land/std@0.130.0/testing/asserts.ts";
import { parseArgKinds } from "./args.ts";

Deno.test("parses", () => {
  const data = [
    "-f",
    "-ab",
    "--force",
    "testing",
    "other",
    "-1",
    "-6.4",
    "--",
    "--test",
    "-t",
  ];
  const args = parseArgKinds(data);

  assertEquals(args, [
    { arg: "f", kind: "ShortFlag" },
    { arg: "a", kind: "ShortFlag" },
    { arg: "b", kind: "ShortFlag" },
    { arg: "force", kind: "LongFlag" },
    { arg: "testing", kind: "Arg" },
    { arg: "other", kind: "Arg" },
    { arg: "-1", kind: "Arg" },
    { arg: "-6.4", kind: "Arg" },
    { arg: "--test", kind: "Arg" },
    { arg: "-t", kind: "Arg" },
  ]);
});
