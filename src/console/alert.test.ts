import { assertEquals } from "@std/assert";
import { innerAlert } from "./alert.ts";
import { createTester } from "./testUtils.ts";
import { Keys } from "./utils.ts";

Deno.test("should dismiss on any key by default", () => {
  const tester = createTester(innerAlert({
    message: "Heads up!",
  }));

  assertEquals(tester.getText(), "Heads up! [press any key]");
  assertEquals(tester.onKey("a"), true);
  assertEquals(tester.getText(), "Heads up!");
});

Deno.test("should dismiss on enter by default", () => {
  const tester = createTester(innerAlert({
    message: "Heads up!",
  }));

  assertEquals(tester.onKey(Keys.Enter), true);
  assertEquals(tester.getText(), "Heads up!");
});

Deno.test("should dismiss on space by default", () => {
  const tester = createTester(innerAlert({
    message: "Heads up!",
  }));

  assertEquals(tester.onKey(Keys.Space), true);
  assertEquals(tester.getText(), "Heads up!");
});

Deno.test("should only dismiss on enter when requireEnter is true", () => {
  const tester = createTester(innerAlert({
    message: "Heads up!",
    requireEnter: true,
  }));

  assertEquals(tester.getText(), "Heads up! [press enter]");
  assertEquals(tester.onKey("a"), undefined);
  assertEquals(tester.onKey(Keys.Space), undefined);
  assertEquals(tester.onKey(Keys.Backspace), undefined);
  assertEquals(tester.getText(), "Heads up! [press enter]");
  assertEquals(tester.onKey(Keys.Enter), true);
  assertEquals(tester.getText(), "Heads up!");
});
