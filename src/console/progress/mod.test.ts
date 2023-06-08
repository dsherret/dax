import { assertEquals } from "$std/testing/asserts.ts";
import { wasmInstance } from "../../lib/mod.ts";
import { renderProgressBar } from "./mod.ts";

const { strip_ansi_codes, static_text_render_once } = wasmInstance;

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
    ].join("\n"),
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
    ].join("\n"),
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
    ].join("\n"),
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
    ].join("\n"),
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
  return strip_ansi_codes(static_text_render_once(items, 80, 10) ?? "");
}
