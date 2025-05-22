import { assertEquals } from "@std/assert";
import { renderTextItems, stripAnsiCodes } from "@david/console-static-text";
import { renderProgressBar } from "./mod.ts";

Deno.test("should render when no length", () => {
  assertEquals(
    getOutput({
      message: "Message",
      prefix: "Prefix",
    }),
    "⠋ Prefix Message",
  );
  assertEquals(
    getOutput({
      prefix: "Prefix",
      tickCount: 1,
    }),
    "⠙ Prefix",
  );
  assertEquals(
    getOutput({
      tickCount: 2,
      message: "Message",
    }),
    "⠹ Message",
  );
  const tickStrings = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  for (let i = 0; i < tickStrings.length + 1; i++) {
    assertEquals(
      getOutput({
        tickCount: i,
      }),
      tickStrings[i % tickStrings.length],
    );
  }
});

Deno.test("should render when has length", () => {
  assertEquals(
    getOutput({
      message: "Message",
      length: 100,
    }),
    [
      "Message",
      "[---------------------------------------------------------] (0/100)",
    ].join("\r\n"),
  );

  assertEquals(
    getOutput({
      prefix: "Prefix",
      currentPos: 50,
      length: 100,
    }),
    [
      "Prefix",
      "[###########################>-----------------------------] (50/100)",
    ].join("\r\n"),
  );

  assertEquals(
    getOutput({
      prefix: "Prefix",
      message: "Message",
      currentPos: 75,
      length: 100,
    }),
    [
      "Prefix Message",
      "[#########################################>---------------] (75/100)",
    ].join("\r\n"),
  );
  assertEquals(
    getOutput({
      currentPos: 100,
      length: 100,
    }),
    "[#########################################################] (100/100)",
  );

  assertEquals(
    getOutput({
      currentPos: 200, // above the length
      length: 100,
    }),
    "[#########################################################] (200/100)",
  );

  // completed
  assertEquals(
    getOutput({
      prefix: "Prefix",
      message: "Message",
      currentPos: 75,
      length: 100,
      hasCompleted: true,
    }),
    "Prefix Message",
  );

  // bytes
  assertEquals(
    getOutput({
      message: "Message",
      currentPos: Math.ceil((1024 * 1024) / 10),
      kind: "bytes",
      length: 1024 * 1024,
    }),
    [
      "Message",
      "[##>------------------------------------] (0.10 MiB/1.00 MiB)",
    ].join("\r\n"),
  );

  // unknown completed
  assertEquals(
    getOutput({
      prefix: "Syncing",
      message: "items",
      currentPos: 42,
    }),
    "⠋ Syncing items (42/?)",
  );

  // unknown bytes
  assertEquals(
    getOutput({
      message: "Downloading",
      currentPos: 12345,
      kind: "bytes",
    }),
    "⠋ Downloading (12.05 KiB/?)",
  );
  assertEquals(
    getOutput({
      message: "Downloading",
      currentPos: 123456789,
      kind: "bytes",
    }),
    "⠋ Downloading (117.73 MiB/?)",
  );
});

function getOutput(state: Partial<Parameters<typeof renderProgressBar>[0]>) {
  const items = renderProgressBar({
    currentPos: 0,
    length: undefined,
    message: undefined,
    prefix: undefined,
    tickCount: 0,
    hasCompleted: false,
    kind: "raw",
    ...state,
  }, { columns: 80, rows: 10 });
  return stripAnsiCodes(renderTextItems(items, { columns: 80, rows: 10 }) ?? "");
}
