import { innerConfirm } from "./confirm.ts";
import { assertEquals } from "../deps.test.ts";
import { createTester } from "./testUtils.ts";
import { Keys } from "./utils.ts";

Deno.test("should render when default is false", () => {
  const tester = createTester(innerConfirm({
    message: "Some question?",
    default: false,
  }));

  assertEquals(tester.getText(), "Some question? (y/N) \u2588");
  assertEquals(tester.onKey("Y"), undefined);
  assertEquals(tester.getText(), "Some question? (y/N) Y\u2588");
  assertEquals(tester.onKey("N"), undefined);
  assertEquals(tester.getText(), "Some question? (y/N) N\u2588");
  assertEquals(tester.onKey("y"), undefined);
  assertEquals(tester.getText(), "Some question? (y/N) Y\u2588");
  assertEquals(tester.onKey("n"), undefined);
  assertEquals(tester.getText(), "Some question? (y/N) N\u2588");
  assertEquals(tester.onKey(Keys.Backspace), undefined);
  assertEquals(tester.getText(), "Some question? (y/N) \u2588");
  assertEquals(tester.onKey(Keys.Enter), false);
  assertEquals(tester.getText(), "Some question? N");
});

Deno.test("should render when default is true", () => {
  const tester = createTester(innerConfirm({
    message: "Some question?",
    default: true,
  }));

  assertEquals(tester.getText(), "Some question? (Y/n) \u2588");
  assertEquals(tester.onKey("Y"), undefined);
  assertEquals(tester.getText(), "Some question? (Y/n) Y\u2588");
  assertEquals(tester.onKey(Keys.Backspace), undefined);
  assertEquals(tester.getText(), "Some question? (Y/n) \u2588");
  assertEquals(tester.onKey(Keys.Enter), true);
  assertEquals(tester.getText(), "Some question? Y");
});

Deno.test("should render when default is undefined", () => {
  const tester = createTester(innerConfirm({
    message: "Some question?",
  }));

  assertEquals(tester.getText(), "Some question? (Y/N) \u2588");
  assertEquals(tester.onKey("Y"), undefined);
  assertEquals(tester.getText(), "Some question? (Y/N) Y\u2588");
  assertEquals(tester.onKey(Keys.Backspace), undefined);
  assertEquals(tester.getText(), "Some question? (Y/N) \u2588");
  assertEquals(tester.onKey(Keys.Enter), undefined);
  assertEquals(tester.getText(), "Some question? (Y/N) \u2588");
  assertEquals(tester.onKey("Y"), undefined);
  assertEquals(tester.getText(), "Some question? (Y/N) Y\u2588");
  assertEquals(tester.onKey(Keys.Enter), true);
  assertEquals(tester.getText(), "Some question? Y");
});
