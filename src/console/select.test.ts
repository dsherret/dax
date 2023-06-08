import { assertEquals } from "$std/testing/asserts.ts";
import { innerSelect } from "./select.ts";
import { createTester } from "./testUtils.ts";
import { Keys } from "./utils.ts";

Deno.test("should render", () => {
  const tester = createTester(innerSelect({
    message: "Some question?",
    options: [
      "Option 1",
      "Option 2",
    ],
  }));

  assertEquals(
    tester.getText(),
    [
      "Some question?",
      "> Option 1",
      "  Option 2",
    ].join("\n"),
  );

  assertEquals(tester.onKey(Keys.Down), undefined);
  assertEquals(
    tester.getText(),
    [
      "Some question?",
      "  Option 1",
      "> Option 2",
    ].join("\n"),
  );

  assertEquals(tester.onKey(Keys.Down), undefined);
  assertEquals(
    tester.getText(),
    [
      "Some question?",
      "> Option 1",
      "  Option 2",
    ].join("\n"),
  );
  assertEquals(tester.onKey(Keys.Up), undefined);
  assertEquals(
    tester.getText(),
    [
      "Some question?",
      "  Option 1",
      "> Option 2",
    ].join("\n"),
  );
  assertEquals(tester.onKey(Keys.Enter), 1);
  assertEquals(
    tester.getText(),
    [
      "Some question?",
      " - Option 2",
    ].join("\n"),
  );
});
