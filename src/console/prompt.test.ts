import { innerPrompt } from "./prompt.ts";
import { assertEquals } from "../deps.test.ts";
import { createTester } from "./testUtils.ts";
import { Keys } from "./utils.ts";

Deno.test("should render", () => {
  const tester = createTester(innerPrompt({
    message: "Some question?",
  }));

  assertEquals(tester.getText(), "Some question? \u2588");
  assertEquals(tester.onKey("A"), undefined);
  assertEquals(tester.onKey("b"), undefined);
  assertEquals(tester.getText(), "Some question? Ab\u2588");
  assertEquals(tester.onKey(Keys.Backspace), undefined);
  assertEquals(tester.getText(), "Some question? A\u2588");
  assertEquals(tester.onKey("c"), undefined);
  assertEquals(tester.getText(), "Some question? Ac\u2588");
  assertEquals(tester.onKey(Keys.Space), undefined);
  assertEquals(tester.onKey("d"), undefined);
  assertEquals(tester.getText(), "Some question? Ac d\u2588");
  assertEquals(tester.onKey(Keys.Enter), "Ac d");
  assertEquals(tester.getText(), "Some question? Ac d");
});

Deno.test("should render with default", () => {
  const tester = createTester(innerPrompt({
    message: "Some question?",
    default: "test",
  }));

  assertEquals(tester.getText(), "Some question? test\u2588");
});
