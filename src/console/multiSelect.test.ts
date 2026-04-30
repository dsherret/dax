import { assertEquals } from "@std/assert";
import { innerMultiSelect } from "./multiSelect.ts";
import { createTester } from "./testUtils.ts";
import { Keys, SelectionItem } from "./utils.ts";

Deno.test("should render", () => {
  const tester = createTester(innerMultiSelect({
    message: "Some question?",
    options: [
      "Option 1",
      {
        text: "Option 2",
        selected: false,
      },
      {
        text: "Option 3",
        selected: true,
      },
    ],
  }));

  assertEquals(
    tester.getText(),
    [
      "Some question?",
      "> [ ] Option 1",
      "  [ ] Option 2",
      "  [x] Option 3",
    ].join("\r\n"),
  );

  assertEquals(tester.onKey(Keys.Down), undefined);
  assertEquals(
    tester.getText(),
    [
      "Some question?",
      "  [ ] Option 1",
      "> [ ] Option 2",
      "  [x] Option 3",
    ].join("\r\n"),
  );

  assertEquals(tester.onKey(Keys.Space), undefined);
  assertEquals(
    tester.getText(),
    [
      "Some question?",
      "  [ ] Option 1",
      "> [x] Option 2",
      "  [x] Option 3",
    ].join("\r\n"),
  );

  assertEquals(tester.onKey(Keys.Down), undefined);
  assertEquals(tester.onKey(Keys.Down), undefined);
  assertEquals(
    tester.getText(),
    [
      "Some question?",
      "> [ ] Option 1",
      "  [x] Option 2",
      "  [x] Option 3",
    ].join("\r\n"),
  );
  assertEquals(tester.onKey(Keys.Up), undefined);
  assertEquals(
    tester.getText(),
    [
      "Some question?",
      "  [ ] Option 1",
      "  [x] Option 2",
      "> [x] Option 3",
    ].join("\r\n"),
  );
  assertEquals(tester.onKey(Keys.Enter), [
    new SelectionItem(1, "Option 2"),
    new SelectionItem(2, "Option 3"),
  ]);
  assertEquals(
    tester.getText(),
    [
      "Some question?",
      " - Option 2",
      " - Option 3",
    ].join("\r\n"),
  );
});

Deno.test("should render when nothing selected", () => {
  const tester = createTester(innerMultiSelect({
    message: "Some question?",
    options: ["Option 1", "Option 2", "Option 3"],
  }));
  assertEquals(tester.onKey(Keys.Enter), []);
  assertEquals(
    tester.getText(),
    [
      "Some question?",
      " <None>",
    ].join("\r\n"),
  );
});
