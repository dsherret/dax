import { assertEquals } from "@std/assert";
import * as colors from "@std/fmt/colors";
import $, { build$, CommandBuilder, Path, PathRef } from "./mod.ts";
import { assert } from "@std/assert";
import { setNotTtyForTesting } from "./src/console/utils.ts";

// Deno will not be a tty because it captures the pipes, but Node
// will be, so manually say that we're not a tty for testing so
// the tests behave somewhat similarly in Node.js
setNotTtyForTesting();

Deno.test("command builder should build", async () => {
  const commandBuilder = new CommandBuilder()
    .env("TEST", "123");
  {
    const local$ = $.build$({ commandBuilder });
    // after creating a $, the environment should be set in stone, so changing
    // this environment variable should have no effect here. Additionally,
    // command builders are immutable and return a new builder each time
    commandBuilder.env("TEST", "456");
    const output = await local$`deno eval 'console.log(Deno.env.get("TEST"));'`.stdout("piped");
    assertEquals(output.code, 0);
    assertEquals(output.stdout, "123\n");
  }

  {
    // this one additionally won't be affected because command builders are immutable
    const local$ = $.build$({ commandBuilder });
    const output = await local$`deno eval 'console.log(Deno.env.get("TEST"));'`.stdout("piped");
    assertEquals(output.code, 0);
    assertEquals(output.stdout, "123\n");
  }
});

Deno.test("build with extras", () => {
  const local$ = build$({
    extras: {
      add(a: number, b: number) {
        return a + b;
      },
    },
  });
  assertEquals(local$.add(1, 2), 3);

  const local$2 = local$.build$({
    extras: {
      subtract(a: number, b: number) {
        return a - b;
      },
    },
  });
  assertEquals(local$2.add(1, 2), 3);
  assertEquals(local$2.subtract(1, 2), -1);

  const local$3 = local$2.build$({
    extras: {
      add(a: string, b: string) {
        return a + b;
      },
      recursive(a: number, times = 0): number {
        if (a === 0) {
          return times;
        } else {
          return local$3.recursive(a - 1, times + 1);
        }
      },
    },
  });

  const result = local$3.add("test", "other");
  assertEquals(result, "testother");
  // @ts-expect-error should error for non-string
  const _assertStringFail: number = result;
  const _assertStringPass: string = result;
  const _noExecute = () => {
    // @ts-expect-error should overwrite previous declaration
    local$3.add(2, 2);

    build$({
      extras: {
        // @ts-expect-error only supports functions at the moment
        prop: 5,
      },
    });
  };

  assertEquals(local$3.recursive(3), 3);
});

Deno.test("build with extras overriding the defaults", () => {
  const local$ = build$({
    extras: {
      escapeArg(a: number, b: number) {
        return a + b;
      },
    },
  });
  // @ts-expect-error should overwrite previous declaration
  local$.escapeArg("test");
  $.escapeArg("test");

  assertEquals(local$.escapeArg(1, 2), 3);
});

Deno.test("basic logging test to ensure no errors", async () => {
  assertEquals($.logDepth, 0);
  $.logGroup();
  assertEquals($.logDepth, 1);
  $.logGroupEnd();
  assertEquals($.logDepth, 0);
  $.logGroupEnd(); // should not error
  assertEquals($.logDepth, 0);
  $.logGroup("Label1");
  let setCount = 0;
  assertEquals($.logDepth, 1);
  $.logGroup("Label2", () => {
    assertEquals($.logDepth, 2);
    setCount++;
  });
  assertEquals(setCount, 1);
  await $.logGroup("Label3", async () => {
    assertEquals($.logDepth, 2);
    await new Promise((resolve) => setTimeout(resolve, 0));
    setCount++;
    $.log("Test");
    await $.logGroup(async () => {
      assertEquals($.logDepth, 3);
      await new Promise((resolve) => setTimeout(resolve, 0));
      setCount++;
      $.log("Test");
    });
    assertEquals($.logDepth, 2);
  });
  assertEquals($.logDepth, 1);
  $.log("Test");
  assertEquals(setCount, 3);
  $.logGroupEnd();
  assertEquals($.logDepth, 0);

  await $.logGroup("Label3", async () => {
    assertEquals($.logDepth, 1);
    $.logGroupEnd();
    assertEquals($.logDepth, 0);
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  assertEquals($.logDepth, 0);

  $.logGroup("Label3", () => {
    assertEquals($.logDepth, 1);
    $.logGroupEnd();
    assertEquals($.logDepth, 0);
  });
  assertEquals($.logDepth, 0);

  $.logDepth = 5;
  assertEquals($.logDepth, 5);
  $.log("Test");
  $.logGroupEnd();
  assertEquals($.logDepth, 4);
  $.logDepth = 0;
});

Deno.test("setting logging", () => {
  const test$ = $.build$();
  const infoLogs: any[] = [];
  const warnLogs: any[] = [];
  const errorLogs: any[] = [];
  test$.setInfoLogger((...args) => {
    infoLogs.push(args);
  });
  test$.setWarnLogger((...args) => {
    warnLogs.push(args);
  });
  test$.setErrorLogger((...args) => {
    errorLogs.push(args);
  });

  test$.log("Info");
  test$.logWarn("Warn");
  test$.logError("Error");

  assertEquals(infoLogs, [["Info"]]);
  assertEquals(warnLogs, [[colors.bold(colors.yellow("Warn"))]]);
  assertEquals(errorLogs, [[colors.bold(colors.red("Error"))]]);
});

Deno.test("printCommand", async () => {
  const $ = build$({});
  const errorLogs: any[] = [];
  $.setErrorLogger((...args) => {
    errorLogs.push(args);
  });

  $.setPrintCommand(true);
  await $`echo 1`;
  await $`echo 2`.printCommand(false);
  await $`echo 3`;
  $.setPrintCommand(false);
  await $`echo 4`;
  await $`echo 5`.printCommand(true);
  const command = $`echo 6`.printCommand(true);
  command.setPrintCommandLogger(() => {}); // no-op
  await command;
  await $`echo 7`.printCommand(true);

  assertEquals(errorLogs, [
    [colors.white(">"), colors.blue("echo 1")],
    [colors.white(">"), colors.blue("echo 3")],
    [colors.white(">"), colors.blue("echo 5")],
    [colors.white(">"), colors.blue("echo 7")],
  ]);
});

Deno.test("progress", () => {
  const logs: string[] = [];
  $.setInfoLogger((...data) => logs.push(data.join(" ")));
  const pb = $.progress("Downloading Test");
  pb.forceRender(); // should not throw;
  assertEquals(logs, [
    "Downloading Test",
  ]);
  pb.message("Other");
  assertEquals(logs, [
    "Downloading Test",
    "Downloading Other",
  ]);
  pb.prefix("Saving");
  assertEquals(logs, [
    "Downloading Test",
    "Downloading Other",
    "Saving Other",
  ]);
});

Deno.test("$.commandExists", async () => {
  assertEquals(await $.commandExists("some-fake-command"), false);
  assertEquals(await $.commandExists("deno"), true);

  const $new = build$({
    commandBuilder: new CommandBuilder().registerCommand("some-fake-command", () => {
      return Promise.resolve({ code: 0 });
    }),
  });
  assertEquals(await $new.commandExists("some-fake-command"), true);
});

Deno.test("$.commandExistsSync", () => {
  assertEquals($.commandExistsSync("some-fake-command"), false);
  assertEquals($.commandExistsSync("deno"), true);

  const $new = build$({
    commandBuilder: new CommandBuilder().registerCommand("some-fake-command", () => {
      return Promise.resolve({ code: 0 });
    }),
  });
  assertEquals($new.commandExistsSync("some-fake-command"), true);
});

Deno.test("$.stripAnsi", () => {
  assertEquals($.stripAnsi("\u001B[4mHello World\u001B[0m"), "Hello World");
  assertEquals($.stripAnsi("no ansi escapes here"), "no ansi escapes here");
});

Deno.test("$.dedent", () => {
  const actual = $.dedent`
        This line will appear without any indentation.
          * This list will appear with 2 spaces more than previous line.
          * As will this line.

        Empty lines (like the one above) will not affect the common indentation.
  `;

  const expected = `
This line will appear without any indentation.
  * This list will appear with 2 spaces more than previous line.
  * As will this line.

Empty lines (like the one above) will not affect the common indentation.`.trim();

  assertEquals(actual, expected);
});

Deno.test("ensure deprecated PathRef export still works", () => {
  const path = new PathRef("hello");
  assert(path instanceof Path);
  assert(path instanceof PathRef);
});
