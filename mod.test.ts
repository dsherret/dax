import { assert, assertEquals, assertMatch, assertRejects, assertStringIncludes, assertThrows } from "@std/assert";
import * as colors from "@std/fmt/colors";
import { Buffer } from "@std/io/buffer";
import { readAll } from "@std/io/read-all";
import { toWritableStream } from "@std/io/to-writable-stream";
import * as path from "@std/path";
import { readerFromStreamReader } from "@std/io/reader-from-stream-reader";
import { isNode } from "which_runtime";
import $, {
  build$,
  CommandBuilder,
  type CommandContext,
  type CommandHandler,
  KillSignal,
  KillSignalController,
  Path,
  PathRef,
} from "./mod.ts";
import { setNotTtyForTesting } from "./src/console/utils.ts";
import { usingTempDir, withTempDir } from "./src/with_temp_dir.ts";

// Deno will not be a tty because it captures the pipes, but Node
// will be, so manually say that we're not a tty for testing so
// the tests behave somewhat similarly in Node.js
setNotTtyForTesting();

Deno.test("should get stdout when piped", async () => {
  const output = await $`echo 5`.stdout("piped");
  assertEquals(output.code, 0);
  assertEquals(output.stdout, "5\n");
});

Deno.test("should escape arguments", async () => {
  const text = await $`echo ${"testing 'this $TEST \`out"}`.text();
  assertEquals(text, "testing 'this $TEST `out");
});

Deno.test("should not get stdout when inherited (default)", async () => {
  const output = await $`echo "should output"`;
  assertEquals(output.code, 0);
  assertThrows(() => output.stdout, Error, `Stdout was not piped (was inherit).`);
});

Deno.test("should not get stdout when null", async () => {
  const output = await $`echo 5`.stdout("null");
  assertEquals(output.code, 0);
  assertThrows(() => output.stdout, Error, `Stdout was not piped (was null).`);
});

Deno.test("should capture stdout when piped", async () => {
  const output = await $`deno eval 'console.log(5);'`.stdout("piped");
  assertEquals(output.code, 0);
  assertEquals(output.stdout, "5\n");
});

Deno.test("should capture stdout when inherited and piped", async () => {
  const output = await $`deno eval 'console.log(5);'`.stdout("inheritPiped");
  assertEquals(output.code, 0);
  assertEquals(output.stdout, "5\n");
});

Deno.test("should not get stdout when set to writer", async () => {
  const buffer = new Buffer();
  const output = await $`echo 5`.stdout(buffer);
  assertEquals(output.code, 0);
  assertEquals(new TextDecoder().decode(buffer.bytes()), "5\n");
  assertThrows(() => output.stdout, Error, `Stdout was streamed to another source and is no longer available.`);
});

Deno.test("should not get stderr when inherited only (default)", async () => {
  const output = await $`deno eval 'console.error("should output");'`;
  assertEquals(output.code, 0);
  assertThrows(
    () => output.stderr,
    Error,
    `Stderr was not piped (was inherit). Call .stderr("piped") or .stderr("inheritPiped") when building the command.`,
  );
});

Deno.test("should not get stderr when null", async () => {
  const output = await $`deno eval 'console.error(5);'`.stderr("null");
  assertEquals(output.code, 0);
  assertThrows(
    () => output.stderr,
    Error,
    `Stderr was not piped (was null). Call .stderr("piped") or .stderr("inheritPiped") when building the command.`,
  );
});

Deno.test("should capture stderr when piped", async () => {
  const output = await $`deno eval 'console.error(5);'`
    .env("NO_COLOR", "1") // deno uses colors when only stderr is piped
    .stderr("piped");
  assertEquals(output.code, 0);
  assertEquals(output.stderr, "5\n");
});

Deno.test("should capture stderr when inherited and piped", async () => {
  const output = await $`deno eval -q 'console.error(5);'`
    .env("NO_COLOR", "1")
    .stderr("inheritPiped");
  assertEquals(output.code, 0);
  assertEquals(output.stderr, "5\n");
});

Deno.test("should not get stderr when set to writer", async () => {
  const buffer = new Buffer();
  const output = await $`deno eval 'console.error(5); console.log(1);'`
    .env("NO_COLOR", "1")
    .stderr(buffer);
  assertEquals(output.code, 0);
  assertEquals(new TextDecoder().decode(buffer.bytes()), "5\n");
  assertThrows(
    () => output.stderr,
    Error,
    `Stderr was streamed to another source and is no longer available.`,
  );
});

Deno.test("should get combined stdout and stderr when specified", async () => {
  const output = await $`echo 1 ; sleep 0.5 ; deno eval -q 'console.error(2);'`.captureCombined();
  assertEquals(output.code, 0);
  assertEquals(output.combined, "1\n2\n");
});

Deno.test("should not get combined stdout and stderr when not calling combined output", async () => {
  const output = await $`deno eval -q 'console.error("should output");'`.stdout("piped").stderr("piped");
  assertEquals(output.code, 0);
  assertThrows(
    () => output.combined,
    Error,
    `Stdout and stderr were not combined. Call .captureCombined() when building the command.`,
  );
});

Deno.test("should error setting stdout after getting combined output", () => {
  for (const value of ["null", "inherit"] as const) {
    assertThrows(
      () => {
        $``.captureCombined(true).stdout(value);
      },
      Error,
      "Cannot set stdout's kind to anything but 'piped' or 'inheritPiped' when combined is true.",
    );
    assertThrows(
      () => {
        $``.captureCombined(true).stderr(value);
      },
      Error,
      "Cannot set stderr's kind to anything but 'piped' or 'inheritPiped' when combined is true.",
    );
  }
});

Deno.test("should get output as bytes", async () => {
  {
    const output = await $`echo 5 && deno eval 'console.error(1);'`.bytes();
    assertEquals(new TextDecoder().decode(output), "5\n");
  }
  {
    const output = await $`echo 5 && deno eval 'console.error(1);'`.bytes("combined");
    assertEquals(new TextDecoder().decode(output), "5\n1\n");
  }
  {
    const output = await $`echo 5 && deno eval 'console.error(1);'`.env("NOCOLOR", "1")
      .bytes("stderr");
    assertEquals(new TextDecoder().decode(output), "1\n");
  }
});

Deno.test("should throw when exit code is non-zero", async () => {
  await assertRejects(
    async () => {
      await $`deno eval 'Deno.exit(1);'`;
    },
    Error,
    "Exited with code: 1",
  );

  await assertRejects(
    async () => {
      await $`deno eval 'Deno.exit(2);'`;
    },
    Error,
    "Exited with code: 2",
  );

  await assertRejects(
    async () => {
      await $`exit 3 && echo 1 && echo 2`;
    },
    Error,
    "Exited with code: 3",
  );

  // regression test for previous bug
  await assertRejects(
    async () => {
      await $`echo 1 && echo 2 && exit 3`;
    },
    Error,
    "Exited with code: 3",
  );
});

Deno.test("should error in the shell when the command can't be found", async () => {
  const output = await $`nonexistentcommanddaxtest`.noThrow().stderr("piped");
  assertEquals(output.code, 127);
  assertEquals(output.stderr, "dax: nonexistentcommanddaxtest: command not found\n");
});

Deno.test("throws when providing an object that doesn't override toString", async () => {
  {
    const obj1 = {};
    assertThrows(
      () => $`echo ${obj1}`,
      Error,
      "Failed resolving expression in command. Provided object does not override `toString()`.",
    );
  }
  {
    const obj2 = {
      toString() {
        return "1";
      },
    };
    const result = await $`echo ${obj2}`.text();
    assertEquals(result, "1");
  }
  class Test {
    toString() {
      return "1";
    }
  }
  {
    const result = await $`echo ${new Test()}`.text();
    assertEquals(result, "1");
  }
});

Deno.test("should change the cwd, but only in the shell", async () => {
  const output = await $`cd src ; deno eval 'console.log(Deno.cwd());'`.stdout("piped");
  const standardizedOutput = output.stdout.trim().replace(/\\/g, "/");
  assertEquals(standardizedOutput.endsWith("src"), true, standardizedOutput);
});

Deno.test("allow setting env", async () => {
  const output = await $`echo $test`.env("test", "123").text();
  assertEquals(output, "123");
});

Deno.test("allow setting multiple env", async () => {
  const output = await $`echo $test$other`.env({
    test: "123",
    other: "456",
  }).text();
  assertEquals(output, "123456");
});

Deno.test("set var for command", async () => {
  const output = await $`test=123 echo $test ; echo $test`
    .env("test", "456")
    .text();
  assertEquals(output, "123\n456");
});

Deno.test("variable substitution", async () => {
  const output = await $`deno eval "console.log($TEST);"`.env("TEST", "123").text();
  assertEquals(output.trim(), "123");
});

Deno.test("stdoutJson", async () => {
  const output = await $`deno eval "console.log(JSON.stringify({ test: 5 }));"`.stdout("piped");
  assertEquals(output.stdoutJson, { test: 5 });
  assertEquals(output.stdoutJson === output.stdoutJson, true); // should be memoized
});

Deno.test("CommandBuilder#json()", async () => {
  const output = await $`deno eval "console.log(JSON.stringify({ test: 5 }));"`.json();
  assertEquals(output, { test: 5 });
});

Deno.test("CommandBuilder#json('stderr')", async () => {
  const output = await $`deno eval "console.error(JSON.stringify({ test: 5 }));"`.json("stderr");
  assertEquals(output, { test: 5 });
});

Deno.test("stderrJson", async () => {
  const output = await $`deno eval "console.error(JSON.stringify({ test: 5 }));"`.stderr("piped");
  assertEquals(output.stderrJson, { test: 5 });
  assertEquals(output.stderrJson === output.stderrJson, true); // should be memoized
});

Deno.test("stderr text", async () => {
  const result = await $`deno eval "console.error(1)"`.env("NO_COLOR", "1").text("stderr");
  assertEquals(result, "1");
});

Deno.test("should handle interpolation", async () => {
  const output = await $`deno eval 'console.log(${5});'`.stdout("piped");
  assertEquals(output.code, 0);
  assertEquals(output.stdout, "5\n");
});

Deno.test("should handle interpolation beside args", async () => {
  const value = "a/b";
  const text = await $`echo ${value}/c`.text();
  assertEquals(text, "a/b/c");
});

Deno.test("should handle providing array of arguments", async () => {
  const args = [1, "2", "test   test"];
  const text = await $`deno eval 'console.log(Deno.args)' ${args}`.text();
  assertEquals(text, `[ "1", "2", "test   test" ]`);
});

Deno.test("raw should handle providing array of arguments", async () => {
  const args = [1, "2", "test   test"];
  const text = await $.raw`deno eval 'console.log(Deno.args)' ${args}`.text();
  assertEquals(text, `[ "1", "2", "test", "test" ]`);
});

Deno.test("raw should handle text provided", async () => {
  const text = await $.raw`deno eval 'console.log(Deno.args)' ${"testing this   out"}`.text();
  assertEquals(text, `[ "testing", "this", "out" ]`);
});

Deno.test("raw should handle command result", async () => {
  const result = await $`echo '1   2   3'`.stdout("piped");
  const text = await $.raw`deno eval 'console.log(Deno.args)' ${result}`.text();
  assertEquals(text, `[ "1", "2", "3" ]`);
});

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

Deno.test("should handle boolean list 'or'", async () => {
  {
    const output = await $`deno eval 'Deno.exit(1)' || deno eval 'console.log(5)'`.text();
    assertEquals(output, "5");
  }
  {
    const output = await $`deno eval 'Deno.exit(1)' || deno eval 'Deno.exit(2)' || deno eval 'Deno.exit(3)'`
      .noThrow()
      .stdout("piped");
    assertEquals(output.stdout, "");
    assertEquals(output.code, 3);
  }
});

Deno.test("should handle boolean list 'and'", async () => {
  {
    const output = await $`deno eval 'Deno.exit(5)' && echo 2`.noThrow().stdout("piped");
    assertEquals(output.code, 5);
    assertEquals(output.stdout, "");
  }
  {
    const output = await $`deno eval 'Deno.exit(0)' && echo 5 && echo 6`.stdout("piped");
    assertEquals(output.code, 0);
    assertEquals(output.stdout.trim(), "5\n6");
  }
});

Deno.test("should support custom command handlers", async () => {
  const builder = new CommandBuilder()
    .registerCommand("zardoz-speaks", async (context) => {
      if (context.args.length != 1) {
        return context.error("zardoz-speaks: expected 1 argument");
      }
      await context.stdout.writeLine(`zardoz speaks to ${context.args[0]}`);
      return {
        code: 0,
      };
    })
    .registerCommands({
      "true": () => Promise.resolve({ code: 0 }),
      "false": () => Promise.resolve({ code: 1 }),
    }).stderr("piped").stdout("piped");

  {
    const result = await builder.command("zardoz-speaks").noThrow();
    assertEquals(result.code, 1);
    assertEquals(result.stderr, "zardoz-speaks: expected 1 argument\n");
  }
  {
    const result = await builder.command("zardoz-speaks to you").noThrow();
    assertEquals(result.code, 1);
    assertEquals(result.stderr, "zardoz-speaks: expected 1 argument\n");
  }
  {
    const result = await builder.command("zardoz-speaks you").noThrow();
    assertEquals(result.code, 0);
    assertEquals(result.stdout, "zardoz speaks to you\n");
  }
  {
    const result = await builder.command("true && echo yup").noThrow();
    assertEquals(result.code, 0);
    assertEquals(result.stdout, "yup\n");
  }
  {
    const result = await builder.command("false && echo nope").noThrow();
    assertEquals(result.code, 1);
    assertEquals(result.stdout, "");
  }
});

Deno.test("should not allow invalid command names", () => {
  const builder = new CommandBuilder();
  const hax: CommandHandler = (context: CommandContext) => {
    context.stdout.writeLine("h4x!1!");
    return {
      code: 0,
    };
  };

  assertThrows(
    () => builder.registerCommand("/dev/null", hax),
    Error,
    "Invalid command name",
  );
  assertThrows(
    () => builder.registerCommand("*", hax),
    Error,
    "Invalid command name",
  );
});

Deno.test("should unregister commands", async () => {
  const builder = new CommandBuilder().unregisterCommand("export").noThrow();
  const output = await builder.command("export somewhere").stderr("piped");
  assertEquals(output.code, 127);
  assertEquals(output.stderr, "dax: export: command not found\n");
});

Deno.test("sleep command", async () => {
  const start = performance.now();
  const result = await $`sleep 0.2 && echo 1`.text();
  const end = performance.now();
  assertEquals(result, "1");
  assertEquals(end - start > 190, true);
});

Deno.test("test command", async (t) => {
  await Deno.writeFile("zero.dat", new Uint8Array());
  await Deno.writeFile("non-zero.dat", new Uint8Array([242]));
  if (Deno.build.os !== "windows") {
    await Deno.symlink("zero.dat", "linked.dat");
  }

  await t.step("test -e", async () => {
    const result = await $`test -e zero.dat`.noThrow();
    assertEquals(result.code, 0);
  });
  await t.step("test -f", async () => {
    const result = await $`test -f zero.dat`.noThrow();
    assertEquals(result.code, 0, "should be a file");
  });
  await t.step("test -f on non-file", async () => {
    const result = await $`test -f ${Deno.cwd()}`.noThrow().stderr("piped");
    assertEquals(result.code, 1, "should not be a file");
    assertEquals(result.stderr, "");
  });
  await t.step("test -d", async () => {
    const result = await $`test -d ${Deno.cwd()}`.noThrow();
    assertEquals(result.code, 0, `${Deno.cwd()} should be a directory`);
  });
  await t.step("test -d on non-directory", async () => {
    const result = await $`test -d zero.dat`.noThrow().stderr("piped");
    assertEquals(result.code, 1, "should not be a directory");
    assertEquals(result.stderr, "");
  });
  await t.step("test -s", async () => {
    const result = await $`test -s non-zero.dat`.noThrow().stderr("piped");
    assertEquals(result.code, 0, "should be > 0");
    assertEquals(result.stderr, "");
  });
  await t.step("test -s on zero-length file", async () => {
    const result = await $`test -s zero.dat`.noThrow().stderr("piped");
    assertEquals(result.code, 1, "should fail as file is zero-sized");
    assertEquals(result.stderr, "");
  });
  if (Deno.build.os !== "windows") {
    await t.step("test -L", async () => {
      const result = await $`test -L linked.dat`.noThrow();
      assertEquals(result.code, 0, "should be a symlink");
    });
  }
  await t.step("test -L on a non-symlink", async () => {
    const result = await $`test -L zero.dat`.noThrow().stderr("piped");
    assertEquals(result.code, 1, "should fail as not a symlink");
    assertEquals(result.stderr, "");
  });
  await t.step("should error on unsupported test type", async () => {
    const result = await $`test -z zero.dat`.noThrow().stderr("piped");
    assertEquals(result.code, 2, "should have exit code 2");
    assertEquals(result.stderr, "test: unsupported test type\n");
  });
  await t.step("should error with not enough arguments", async () => {
    const result = await $`test`.noThrow().stderr("piped");
    assertEquals(result.code, 2, "should have exit code 2");
    assertEquals(result.stderr, "test: expected 2 arguments\n");
  });
  await t.step("should error with too many arguments", async () => {
    const result = await $`test -f a b c`.noThrow().stderr("piped");
    assertEquals(result.code, 2, "should have exit code 2");
    assertEquals(result.stderr, "test: expected 2 arguments\n");
  });
  await t.step("should work with boolean: pass && ..", async () => {
    const result = await $`test -f zero.dat && echo yup`.noThrow().stdout("piped");
    assertEquals(result.code, 0);
    assertEquals(result.stdout, "yup\n");
  });
  await t.step("should work with boolean: fail && ..", async () => {
    const result = await $`test -f ${Deno.cwd()} && echo nope`.noThrow().stdout("piped");
    assertEquals(result.code, 1), "should have exit code 1";
    assertEquals(result.stdout, "");
  });
  await t.step("should work with boolean: pass || ..", async () => {
    const result = await $`test -f zero.dat || echo nope`.noThrow().stdout("piped");
    assertEquals(result.code, 0);
    assertEquals(result.stdout, "");
  });
  await t.step("should work with boolean: fail || ..", async () => {
    const result = await $`test -f ${Deno.cwd()} || echo yup`.noThrow().stdout("piped");
    assertEquals(result.code, 0);
    assertEquals(result.stdout, "yup\n");
  });

  if (Deno.build.os !== "windows") {
    await Deno.remove("linked.dat");
  }
  await Deno.remove("zero.dat");
  await Deno.remove("non-zero.dat");
});

Deno.test("exit command", async () => {
  {
    const result = await $`exit`.noThrow();
    assertEquals(result.code, 1);
  }
  {
    const result = await $`exit 0`.noThrow();
    assertEquals(result.code, 0);
  }
  {
    const result = await $`exit 255`.noThrow();
    assertEquals(result.code, 255);
  }
  {
    const result = await $`exit 256`.noThrow();
    assertEquals(result.code, 0);
  }
  {
    const result = await $`exit 257`.noThrow();
    assertEquals(result.code, 1);
  }
  {
    const result = await $`exit -1`.noThrow();
    assertEquals(result.code, 255);
  }
  {
    const result = await $`exit zardoz`.noThrow().stderr("piped");
    assertEquals(result.code, 2);
    assertEquals(result.stderr, "exit: numeric argument required.\n");
  }
  {
    const result = await $`exit 1 1`.noThrow().stderr("piped");
    assertEquals(result.code, 2);
    assertEquals(result.stderr, "exit: too many arguments\n");
  }
  // test noThrow with exit code
  {
    const result = await $`exit 255`.noThrow(255);
    assertEquals(result.code, 255);
  }
  {
    const result = await $`exit 255`.noThrow(254, 255);
    assertEquals(result.code, 255);
  }
  {
    await assertRejects(() => $`exit 255`.noThrow(254));
  }
});

Deno.test("should provide result from one command to another", async () => {
  const result = await $`echo 1`.stdout("piped");
  const result2 = await $`echo ${result}`.stdout("piped");
  assertEquals(result2.stdout, "1\n");
});

Deno.test("should actually change the environment when using .exportEnv()", async () => {
  const originalDir = Deno.cwd();
  try {
    const srcDir = path.resolve("./src");
    await $`cd src && export SOME_VALUE=5 && OTHER_VALUE=6`.exportEnv();
    assertEquals(Deno.cwd(), srcDir);
    assertEquals(Deno.env.get("SOME_VALUE"), "5");
    assertEquals(Deno.env.get("OTHER_VALUE"), undefined);
  } finally {
    Deno.chdir(originalDir);
  }
});

Deno.test("exporting env should modify real environment when something changed via the api", async () => {
  const previousCwd = Deno.cwd();
  const envName = "DAX_TEST_ENV_SET";
  try {
    await $`echo 2`
      .cwd("./src")
      .env(envName, "123")
      .exportEnv();
    assertEquals(Deno.env.get(envName), "123");
    assertEquals(Deno.cwd().slice(-3), "src");
  } finally {
    Deno.env.delete(envName);
    Deno.chdir(previousCwd);
  }
});

Deno.test("env should be clean slate when clearEnv is set", async () => {
  {
    const text = await $`printenv`.clearEnv().text();
    assertEquals(text, "");
  }
  Deno.env.set("DAX_TVAR", "123");
  try {
    const text = await $`deno eval --no-config 'console.log("DAX_TVAR: " + Deno.env.get("DAX_TVAR"))'`.clearEnv()
      .text();
    assertEquals(text, "DAX_TVAR: undefined");
  } finally {
    Deno.env.delete("DAX_TVAR");
  }
});

Deno.test("clearEnv + exportEnv should not clear out real environment", async () => {
  Deno.env.set("DAX_TVAR", "123");
  try {
    const text =
      await $`deno eval --no-config 'console.log("VAR: " + Deno.env.get("DAX_TVAR") + " VAR2: " + Deno.env.get("DAX_TVAR2"))'`
        .env("DAX_TVAR2", "shake it shake")
        .clearEnv()
        .exportEnv()
        .text();
    assertEquals(text, "VAR: undefined VAR2: shake it shake");
    assertEquals(Deno.env.get("DAX_TVAR2"), "shake it shake");
  } finally {
    Deno.env.delete("DAX_TVAR");
    Deno.env.delete("DAX_TVAR2");
  }
});

Deno.test("setting an empty env var", async () => {
  const text = await $`VAR= deno eval 'console.log("VAR: " + Deno.env.get("VAR"))'`.text();
  assertEquals(text, "VAR: ");
});

Deno.test("unsetting env var", async () => {
  const text = await $`unset VAR && deno eval 'console.log("VAR: " + Deno.env.get("VAR"))'`
    .env("VAR", "1")
    .text();
  assertEquals(text, "VAR: undefined");
});

Deno.test("unsetting multiple env vars", async () => {
  const text =
    await $`unset VAR1 VAR2 && deno eval 'console.log("VAR: " + Deno.env.get("VAR1") + Deno.env.get("VAR2") + Deno.env.get("VAR3"))'`
      .env({
        "VAR1": "test",
        "VAR2": "test",
        "VAR3": "test",
      })
      .text();
  assertEquals(text, "VAR: undefinedundefinedtest");
});

Deno.test("unsetting multiple shell vars", async () => {
  const text = await $`VAR1=1 && VAR2=2 && VAR3=3 && VAR4=4 && unset VAR1 VAR4 && echo $VAR1 $VAR2 $VAR3 $VAR4`
    .text();
  assertEquals(text, "2 3");
});

Deno.test("unsetting shell var with -v", async () => {
  const text = await $`VAR1=1 && unset -v VAR1 && echo $VAR1 test`
    .text();
  assertEquals(text, "test");
});

Deno.test("unsetting with no args", async () => {
  const text = await $`unset && echo test`
    .text();
  assertEquals(text, "test");
});

Deno.test("unset with -f should error", async () => {
  const result = await $`unset -f VAR1 && echo $VAR1`
    .env({ "VAR1": "test" })
    .stdout("piped")
    .stderr("piped")
    .noThrow();
  assertEquals(result.code, 1);
  assertEquals(result.stderr, "unset: unsupported flag: -f\n");
  assertEquals(result.stdout, "");
});

Deno.test("cwd should be resolved based on cwd at time of method call and not execution", async () => {
  await withTempDir(async (tempDir) => {
    await tempDir.join("./src/rs_lib").ensureDir();
    const command = $`echo $PWD`.cwd("./src");
    Deno.chdir("./src/rs_lib");
    const result = await command.text();
    assertEquals(result.slice(-3), "src");
  });
});

Deno.test("should handle the PWD variable", async () => {
  const srcDir = path.resolve("./src");
  {
    const output = await $`cd src && echo $PWD `.text();
    assertEquals(output, srcDir);
  }
  {
    // changing PWD should affect this
    const output = await $`PWD=$PWD/src && echo $PWD `.text();
    assertEquals(output, srcDir);
  }
});

Deno.test("timeout", async () => {
  const command = $`deno eval 'await new Promise(resolve => setTimeout(resolve, 10_000));'`
    .timeout(200);
  await assertRejects(async () => await command, Error, "Timed out with exit code: 124");

  const result = await command.noThrow();
  assertEquals(result.code, 124);
});

Deno.test("abort", async () => {
  const command = $`echo 1 && sleep 100 && echo 2`;
  await assertRejects(
    async () => {
      const child = command.spawn();
      child.kill();
      await child;
    },
    Error,
    "Aborted with exit code: 124",
  );

  const child = command.noThrow().spawn();
  child.kill();
  const result = await child;
  assertEquals(result.code, 124);
});

Deno.test("piping to stdin", async (t) => {
  await t.step("reader", async () => {
    const bytes = new TextEncoder().encode("test\n");
    const result =
      await $`deno eval "const b = new Uint8Array(4); await Deno.stdin.read(b); await Deno.stdout.write(b);"`
        .stdin(new Buffer(bytes))
        .text();
    assertEquals(result, "test");
  });

  await t.step("string", async () => {
    const command = $`deno eval "const b = new Uint8Array(4); await Deno.stdin.read(b); await Deno.stdout.write(b);"`
      .stdinText("test\n");
    // should support calling multiple times
    assertEquals(await command.text(), "test");
    assertEquals(await command.text(), "test");
  });

  await t.step("Uint8Array", async () => {
    const result =
      await $`deno eval "const b = new Uint8Array(4); await Deno.stdin.read(b); await Deno.stdout.write(b);"`
        .stdin(new TextEncoder().encode("test\n"))
        .text();
    assertEquals(result, "test");
  });

  await t.step("readable stream", async () => {
    const child = $`echo 1 && echo 2`.stdout("piped").spawn();
    const result = await $`deno eval 'await Deno.stdin.readable.pipeTo(Deno.stdout.writable);'`
      .stdin(child.stdout())
      .text();
    assertEquals(result, "1\n2");
  });

  await t.step("Path", async () => {
    await using tempDir = usingTempDir();
    const tempFile = tempDir.join("temp_file.txt");
    const fileText = "1 testing this out\n".repeat(1_000);
    tempFile.writeTextSync(fileText);
    const output = await $`cat`.stdin(tempFile).text();
    assertEquals(output, fileText.trim());
  });

  await t.step("command via stdin", async () => {
    const child = $`echo 1 && echo 2`;
    const result = await $`deno eval 'await Deno.stdin.readable.pipeTo(Deno.stdout.writable);'`
      .stdin(child)
      .text();
    assertEquals(result, "1\n2");
  });

  await t.step("command that exits via stdin", async () => {
    const child = $`echo 1 && echo 2 && exit 1`;
    const result = await $`deno eval 'await Deno.stdin.readable.pipeTo(Deno.stdout.writable);'`
      .stdin(child)
      .stderr("piped")
      .noThrow();
    assertEquals(result.code, 1);
    assertEquals(result.stderr, "stdin pipe broken. Exited with code: 1\n");
  });
});

Deno.test("pipe", async () => {
  {
    const result = await $`echo 1 && echo 2`
      .pipe($`deno eval 'await Deno.stdin.readable.pipeTo(Deno.stderr.writable);'`)
      .stderr("piped")
      .stdout("piped")
      .spawn();
    assertEquals(result.stdout, "");
    assertEquals(result.stderr, "1\n2\n");
  }
});

Deno.test("piping to a writable and the command fails", async () => {
  const chunks = [];
  let wasClosed = false;
  const writableStream = new WritableStream({
    write(chunk) {
      chunks.push(chunk);
    },
    close() {
      wasClosed = true;
    },
  });
  await $`echo 1 ; exit 1`.stdout(writableStream).noThrow();
  assertEquals(chunks.length, 1);
  assert(wasClosed);
});

Deno.test("piping to a writable and the command fails and throws", async () => {
  const chunks = [];
  let wasClosed = false;
  const writableStream = new WritableStream({
    write(chunk) {
      chunks.push(chunk);
    },
    close() {
      wasClosed = true;
    },
  });
  let didThrow = false;
  try {
    await $`echo 1 ; exit 1`.stdout(writableStream);
  } catch {
    didThrow = true;
  }
  assert(didThrow);
  assertEquals(chunks.length, 1);
  assert(wasClosed);
});

Deno.test("piping to a writable that throws", async () => {
  const writableStream = new WritableStream({
    write(_chunk) {
      throw new Error("failed");
    },
  });
  const result = await $`echo 1`.stdout(writableStream).stderr("piped").noThrow();
  assertEquals(result.code, 1);
  assertEquals(result.stderr, "echo: failed\n");
});

Deno.test("piping stdout/stderr to a file", async () => {
  await withTempDir(async (tempDir) => {
    const tempFile = tempDir.join("temp_file.txt");
    await $`echo 1`.stdout(tempFile);
    assertEquals(tempFile.readTextSync(), "1\n");
  });

  await withTempDir(async (tempDir) => {
    const tempFile = tempDir.join("temp_file.txt");
    await $`deno eval 'console.error(1);'`
      .env("NO_COLOR", "1")
      .stderr(tempFile);
    assertEquals(tempFile.readTextSync(), "1\n");
  });

  await withTempDir(async (tempDir) => {
    const tempFile = tempDir.join("temp_file.txt");
    {
      using file = tempFile.openSync({ write: true, create: true, truncate: true });
      await $`deno eval "console.log('1234\\n'.repeat(1_000));"`.stdout(file.writable);
    }
    const text = tempFile.readTextSync();
    // last \n for the console.log itself
    assertEquals(text, "1234\n".repeat(1_000) + "\n");
  });
});

Deno.test("spawning a command twice that has stdin set to a Reader should error", async () => {
  const bytes = new TextEncoder().encode("test\n");
  const command = $`deno eval "const b = new Uint8Array(4); await Deno.stdin.read(b); await Deno.stdout.write(b);"`
    .stdin(new Buffer(bytes));
  const result = await command.text();
  assertEquals(result, "test");
  await assertRejects(
    () => command.text(),
    Error,
    "Cannot spawn command. Stdin was already consumed when a previous command using the same stdin " +
      "was spawned. You need to call `.stdin(...)` again with a new value before spawning.",
  );
});

Deno.test("streaming api not piped", async () => {
  const child = $`echo 1 && echo 2`.spawn();
  assertThrows(
    () => child.stdout(),
    Error,
    `No pipe available. Ensure stdout is "piped" (not "inheritPiped") and combinedOutput is not enabled.`,
  );
  assertThrows(
    () => child.stderr(),
    Error,
    `No pipe available. Ensure stderr is "piped" (not "inheritPiped") and combinedOutput is not enabled.`,
  );
  await child;
});

Deno.test("streaming api then non-streaming should error", async () => {
  const child = $`echo 1 && echo 2`.stdout("piped").stderr("piped").spawn();
  const stdout = readerFromStreamReader(child.stdout().getReader());
  const stderr = readerFromStreamReader(child.stderr().getReader());
  const result = await child;
  // ensure these are all read to prevent issues with sanitizers
  await readAll(stdout);
  await readAll(stderr);

  assertThrows(
    () => {
      result.stdout;
    },
    Error,
    "Stdout was streamed to another source and is no longer available.",
  );
  assertThrows(
    () => {
      result.stderr;
    },
    Error,
    "Stderr was streamed to another source and is no longer available.",
  );
});

Deno.test("streaming api", async () => {
  // stdout
  {
    const child = $`echo 1 && echo 2`.stdout("piped").spawn();
    const text = await $`deno eval 'await Deno.stdin.readable.pipeTo(Deno.stdout.writable);'`
      .stdin(child.stdout())
      .text();
    assertEquals(text, "1\n2");
  }

  // stderr
  {
    const child = $`deno eval -q 'console.error(1); console.error(2)'`
      .env("NO_COLOR", "1")
      .stderr("piped")
      .spawn();
    const text = await $`deno eval 'await Deno.stdin.readable.pipeTo(Deno.stdout.writable);'`
      .stdin(child.stderr())
      .text();
    assertEquals(text, "1\n2");
  }

  // both
  {
    const child = $`deno eval -q 'console.log(1); setTimeout(() => console.error(2), 10)'`
      .stdout("piped")
      .stderr("piped")
      .spawn();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        let hasClosed = false;
        read(child.stdout().getReader());
        read(child.stderr().getReader());

        async function read(reader: ReadableStreamDefaultReader<Uint8Array>) {
          while (true) {
            const v = await reader.read();
            if (v.value != null) {
              controller.enqueue(v.value);
            } else if (v.done) {
              if (!hasClosed) {
                controller.close();
                hasClosed = true;
              }
              return;
            }
          }
        }
      },
    });
    const text = await $`deno eval -q 'await Deno.stdin.readable.pipeTo(Deno.stdout.writable);'`
      .stdin(stream)
      .text();
    assertEquals(text, "1\n2");
  }
});

Deno.test("streaming api errors while streaming", async () => {
  {
    const child = $`echo 1 && echo 2 && exit 1`.stdout("piped").spawn();
    const stdout = child.stdout();

    await assertRejects(
      async () => {
        await $`deno eval 'await Deno.stdin.readable.pipeTo(Deno.stdout.writable);'`
          .stdin(stdout)
          .text();
      },
      Error,
      "Exited with code: 1",
    );
  }

  {
    const child = $`echo 1 && echo 2 && sleep 0.6 && exit 1`.stdout("piped").spawn();
    const stdout = child.stdout();

    const result = await $`deno eval 'await Deno.stdin.readable.pipeTo(Deno.stdout.writable);'`
      .stdin(stdout)
      .noThrow()
      .stdout("piped")
      .stderr("piped")
      .spawn();
    assertEquals(result.stderr, "stdin pipe broken. Exited with code: 1\n");
    assertEquals(result.stdout, "1\n2\n");
  }
});

Deno.test("streaming api stdin not used in provided command", async () => {
  const child = $`echo 1 && sleep 90 && exit 1`.stdout("piped").spawn();
  const stdout = child.stdout();

  const text = await $`deno eval 'console.log(1)'`
    .stdin(stdout)
    .text();
  assertEquals(text, "1");
  child.kill();
  await assertRejects(
    async () => {
      await child;
    },
    Error,
    "Aborted with exit code: 124",
  );
});

Deno.test("streaming api no buffers overwrite", async () => {
  const child = $`echo 1 && sleep 0.1 && echo 2 && echo 3`.stdout("piped").spawn();
  const stdout = child.stdout();
  // wait for the child to finish so the stream fills up
  await child;

  // now start reading it. The data should not be corrupted
  let text = "";
  for await (const chunk of stdout.pipeThrough(new TextDecoderStream())) {
    text += chunk;
  }
  assertEquals(text, "1\n2\n3\n");
});

Deno.test("command args", async () => {
  const input = "testing   'this   out";
  const result = await new CommandBuilder()
    .command(["echo", input])
    .stdout("piped");
  assertEquals(result.stdout.trim(), input);
  // should be properly escaped here too
  assertEquals(await $`echo ${result}`.text(), input);
});

Deno.test("command .lines()", async () => {
  const result = await $`echo 1 && echo 2`.lines();
  assertEquals(result, ["1", "2"]);
});

Deno.test("command .lines('stderr')", async () => {
  const result = await $`deno eval "console.error(1); console.error(2)"`.env("NO_COLOR", "1").lines("stderr");
  assertEquals(result, ["1", "2"]);
});

Deno.test("command .lines('combined')", async () => {
  const result = await $`deno eval "console.log(1); console.error(2)"`.lines("combined");
  assertEquals(result.sort(), ["1", "2"]);
});

Deno.test("piping in command", async () => {
  await withTempDir(async (tempDir) => {
    const result = await $`echo 1 | cat - > output.txt`.cwd(tempDir).text();
    assertEquals(result, "");
    assertEquals(tempDir.join("output.txt").readTextSync(), "1\n");
  });
  {
    const result = await $`echo 1 | cat -`.text();
    assertEquals(result, "1");
  }
  {
    const result = await $`echo 1 && echo 2 | cat -`.text();
    assertEquals(result, "1\n2");
  }
  {
    const result = await $`echo 1 || echo 2 | cat -`.text();
    assertEquals(result, "1");
  }
});

Deno.test("subshells", async () => {
  {
    const result = await $`(echo 1 && echo 2) | cat -`.text();
    assertEquals(result, "1\n2");
  }
  {
    const result = await $`(echo 1 && echo 2) && echo 3`.text();
    assertEquals(result, "1\n2\n3");
  }
  {
    const result = await $`(echo 1 && echo 2) || echo 3`.text();
    assertEquals(result, "1\n2");
  }
  {
    const result = await $`echo 1 && (echo 2 || echo 3)`.text();
    assertEquals(result, "1\n2");
  }
  {
    const result = await $`echo 1 && (echo 2 && echo 3) || echo 4`.text();
    assertEquals(result, "1\n2\n3");
  }
  {
    const result = await $`echo 1 && (echo 2 || echo 3) && echo 4`.text();
    assertEquals(result, "1\n2\n4");
  }
  // exiting shouldn't exit the parent
  {
    const result = await $`echo 1 && (echo 2 && exit 0 && echo 3) && echo 4`.text();
    assertEquals(result, "1\n2\n4");
  }
  {
    const result = await $`echo 1 && (echo 2 && exit 1 && echo 3) || echo 4`.text();
    assertEquals(result, "1\n2\n4");
  }
  // shouldn't change the environment either
  {
    assertEquals(await $`export VAR=5 && echo $VAR`.text(), "5"); // for reference
    const result = await $`(export VAR=5) && echo $VAR`.text();
    assertEquals(result, "");
  }
  {
    const result = await $`echo 1 && (echo 2 && export VAR=5 && echo $VAR) && echo $VAR`.text();
    assertEquals(result, "1\n2\n5\n");
  }
  await withTempDir(async (tempDir) => {
    const subDir = tempDir.join("subDir");
    subDir.mkdirSync();
    const result = await $`(cd subDir && pwd) && pwd`.cwd(tempDir).text();
    assertEquals(result, `${subDir}\n${tempDir}`);
  });
});

Deno.test("output redirects", async () => {
  await withTempDir(async (tempDir) => {
    // absolute
    const tempFile = tempDir.join("temp_file.txt");
    await $`echo 1 > ${tempFile}`;
    assertEquals(tempFile.readTextSync(), "1\n");
    tempFile.removeSync();

    // relative
    await $`echo 2 > ./temp_file.txt`;
    assertEquals(tempFile.readTextSync(), "2\n");

    // changing directories then relative
    await $`mkdir sub_dir && cd sub_dir && echo 3 > ./temp_file.txt`;
    assertEquals(tempDir.join("sub_dir/temp_file.txt").readTextSync(), "3\n");

    // stderr
    await $`deno eval 'console.log(2); console.error(5);' 2> ./temp_file.txt`.env("NO_COLOR", "1");
    assertEquals(tempFile.readTextSync(), "5\n");

    // append
    await $`deno eval 'console.error(1);' 2> ./temp_file.txt && echo 2 >> ./temp_file.txt && echo 3 >> ./temp_file.txt`
      .env("NO_COLOR", "1");
    assertEquals(tempFile.readTextSync(), "1\n2\n3\n");

    // /dev/null
    assertEquals(await $`echo 1 > /dev/null`.text(), "");
    assertEquals(await $`deno eval 'console.error(1); console.log(2)' 2> /dev/null`.env("NO_COLOR", "1").text(), "2");

    // not supported fd
    {
      const result = await $`echo 1 3> file.txt`.noThrow().stderr("piped");
      assertEquals(result.code, 1);
      assertEquals(result.stderr, "only redirecting to stdout (1) and stderr (2) is supported\n");
    }

    // multiple words
    {
      const result = await $`echo 1 > $var`.env("var", "testing this").noThrow().stderr("piped");
      assertEquals(result.code, 1);
      assertEquals(
        result.stderr,
        'redirect path must be 1 argument, but found 2 (testing this). Did you mean to quote it (ex. "testing this")?\n',
      );
    }

    // piping to a directory
    {
      const dir = tempDir.join("dir");
      dir.mkdirSync();
      const result = await $`echo 1 > ${dir}`.noThrow().stderr("piped");
      assertEquals(result.code, 1);
      assert(result.stderr.startsWith("failed opening file for redirect"));
    }

    {
      assertThrows(
        () => $`echo 1 > ${new TextEncoder()}`,
        Error,
        "Failed resolving expression in command. Unsupported object provided to output redirect.",
      );
    }
  });
});

Deno.test("input redirects", async () => {
  await withTempDir(async (tempDir) => {
    tempDir.join("test.txt").writeTextSync("Hi!");
    const text = await $`cat - < test.txt`.text();
    assertEquals(text, "Hi!");
  });
});

Deno.test("input redirects with provided object", async () => {
  {
    assertThrows(
      () => $`cat - < ${new TextEncoder()} && echo ${"test"}`,
      Error,
      "Failed resolving expression 1/2 in command. Unsupported object provided to input redirect.",
    );
  }
  // stream
  {
    const text = "testing".repeat(1000);
    const bytes = new TextEncoder().encode(text);
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(bytes);
        controller.close();
      },
    });
    const output = await $`cat - < ${stream}`.text();
    assertEquals(output, text);
  }
  // string
  {
    const text = "testing".repeat(1000);
    const output = await $`cat - < ${text}`.text();
    assertEquals(output, text);
  }
  // bytes
  {
    const text = "testing".repeat(1000);
    const bytes = new TextEncoder().encode(text);
    const output = await $`cat - < ${bytes}`.text();
    assertEquals(output, text);
  }
  // response
  {
    const text = "testing".repeat(1000);
    const response = new Response(text);
    const output = await $`cat - < ${response}`.text();
    assertEquals(output, text);
  }
  // file
  await withTempDir(async (tempDir) => {
    const text = "testing".repeat(1000);
    const filePath = tempDir.join("file.txt");
    filePath.writeTextSync(text);
    const file = filePath.openSync({ read: true });
    const output = await $`cat - < ${file}`.text();
    assertEquals(output, text);
  });
  // function
  {
    const text = "testing".repeat(1000);
    const response = new Response(text);
    const output = await $`cat - < ${() => response.body!}`.text();
    assertEquals(output, text);
  }
});

Deno.test("output redirect with provided object", async () => {
  await withTempDir(async (tempDir) => {
    const buffer = new Buffer();
    const pipedText = "testing\nthis\nout".repeat(1_000);
    tempDir.join("data.txt").writeTextSync(pipedText);
    await $`cat data.txt > ${toWritableStream(buffer)}`.cwd(tempDir);
    assertEquals(new TextDecoder().decode(buffer.bytes()), pipedText);
  });
  {
    const chunks = [];
    let wasClosed = false;
    const writableStream = new WritableStream({
      write(chunk) {
        chunks.push(chunk);
      },
      close() {
        wasClosed = true;
      },
    });
    let didThrow = false;
    try {
      await $`echo 1 > ${writableStream} ; exit 1`;
    } catch {
      didThrow = true;
    }
    assert(didThrow);
    assertEquals(chunks.length, 1);
    assert(wasClosed);
  }
  {
    const bytes = new Uint8Array(2);
    await $`echo 1 > ${bytes}`;
    assertEquals(new TextDecoder().decode(bytes), "1\n");
  }
  // overflow
  {
    const bytes = new Uint8Array(1);
    const result = await $`echo 1 > ${bytes}`.noThrow().stderr("piped");
    assertEquals(result.stderr, "echo: Overflow writing 2 bytes to Uint8Array (length: 1).\n");
    assertEquals(result.code, 1);
    assertEquals(bytes[0], 49);
  }
  // file
  await withTempDir(async (tempDir) => {
    const filePath = tempDir.join("file.txt");
    const file = filePath.openSync({ write: true, create: true, truncate: true });
    await $`echo testing > ${file}`;
    assertEquals(filePath.readTextSync(), "testing\n");
  });
  // function
  {
    const chunks: Uint8Array[] = [];
    const writableStream = new WritableStream({
      write(chunk) {
        chunks.push(chunk);
      },
    });
    await $`echo 1 > ${() => writableStream}`;
    assertEquals(chunks, [new Uint8Array([49, 10])]);
  }
  {
    assertThrows(
      () => $`echo 1 > ${"test.txt"}`,
      Error,
      "Failed resolving expression in command. Cannot provide strings to output " +
        "redirects. Did you mean to provide a path instead via the `$.path(...)` API?",
    );
  }
});

Deno.test("shebang support", async (t) => {
  await withTempDir(async (dir) => {
    const steps: Promise<boolean>[] = [];
    const step = (name: string, fn: () => Promise<void>) => {
      steps.push(t.step({
        name,
        fn,
        sanitizeExit: false,
        sanitizeOps: false,
        sanitizeResources: false,
      }));
    };

    step("with -S", async () => {
      dir.join("file.ts").writeTextSync(
        [
          "#!/usr/bin/env -S deno run",
          "console.log(5);",
        ].join("\n"),
      );
      const output = await $`./file.ts`
        .cwd(dir)
        .text();
      assertEquals(output, "5");
    });

    step("without -S and invalid", async () => {
      dir.join("file2.ts").writeTextSync(
        [
          "#!/usr/bin/env deno run",
          "console.log(5);",
        ].join("\n"),
      );
      await assertRejects(
        async () => {
          await $`./file2.ts`
            .cwd(dir)
            .text();
        },
        Error,
        "Exited with code: 127",
      );
    });

    step("without -S, but valid", async () => {
      dir.join("echo_stdin.ts").writeTextSync(
        [
          "#!/usr/bin/env -S deno run --allow-run",
          "await new Deno.Command('deno', { args: ['run', ...Deno.args] }).spawn();",
        ].join("\n"),
      );
      dir.join("file3.ts").writeTextSync(
        [
          "#!/usr/bin/env ./echo_stdin.ts",
          "console.log('Hello')",
        ].join("\n"),
      );
      const output = await $`./file3.ts`
        .cwd(dir)
        .text();
      assertEquals(output, "Hello");
    });

    step("relative sub dir", async () => {
      dir.join("echo_stdin2.ts").writeTextSync(
        [
          "#!/usr/bin/env -S deno run --allow-run",
          "await new Deno.Command('deno', { args: ['run', ...Deno.args] }).spawn();",
        ].join("\n"),
      );
      dir.join("sub/sub.ts").writeTextSync(
        [
          "#!/usr/bin/env ../echo_stdin2.ts",
          "console.log('Hello')",
        ].join("\n"),
      );
      const output = await $`./sub/sub.ts`
        .cwd(dir)
        .text();
      assertEquals(output, "Hello");
    });

    await Promise.all(steps);
  });
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

Deno.test("environment should be evaluated at command execution", async () => {
  const envName = "DAX_TEST_ENV_SET";
  Deno.env.set(envName, "1");
  try {
    const result = await $.raw`echo $${envName}`.text();
    assertEquals(result, "1");
  } finally {
    Deno.env.delete(envName);
  }
  const result = await $.raw`echo $${envName}`.text();
  assertEquals(result, "");

  // check cwd
  const previousCwd = Deno.cwd();
  try {
    Deno.chdir("./src");
    const result = await $`echo $PWD`.text();
    assertEquals(result.slice(-3), "src");
  } finally {
    Deno.chdir(previousCwd);
  }
});

Deno.test("test remove", async () => {
  await withTempDir(async (dir) => {
    const emptyDir = dir.join("hello");
    const someFile = dir.join("a.txt");
    const notExists = dir.join("notexists");

    emptyDir.mkdirSync();
    someFile.writeTextSync("");

    // Remove empty directory or file
    await $`rm ${emptyDir}`;
    await $`rm ${someFile}`;
    assertEquals(emptyDir.existsSync(), false);
    assertEquals(someFile.existsSync(), false);

    // Remove a non-empty directory
    const nonEmptyDir = dir.join("a");
    nonEmptyDir.join("b").mkdirSync({ recursive: true });
    {
      const error = await $`rm ${nonEmptyDir}`.noThrow().stderr("piped").spawn()
        .then((r) => r.stderr);
      const expectedText = isNode
        ? "rm: directory not empty, rmdir"
        : Deno.build.os === "linux" || Deno.build.os === "darwin"
        ? "rm: Directory not empty"
        : "rm: The directory is not empty";
      assertEquals(error.substring(0, expectedText.length), expectedText);
    }
    {
      await $`rm -r ${nonEmptyDir}`;
      assertEquals(nonEmptyDir.existsSync(), false);
    }

    // Remove a directory that does not exist
    {
      const [error, code] = await $`rm ${notExists}`.noThrow().stderr("piped").spawn()
        .then((r) => [r.stderr, r.code] as const);
      const expectedText = isNode
        ? "rm: no such file or directory, lstat"
        : Deno.build.os === "linux" || Deno.build.os === "darwin"
        ? "rm: No such file or directory"
        : "rm: The system cannot find the file specified";
      assertEquals(error.substring(0, expectedText.length), expectedText);
      assertEquals(code, 1);
    }
    {
      const [error, code] = await $`rm -Rf ${notExists}`.noThrow().stderr("piped").spawn()
        .then((r) => [r.stderr, r.code] as const);
      assertEquals(error, "");
      assertEquals(code, 0);
    }
  });
});

Deno.test("test mkdir", async () => {
  await withTempDir(async (dir) => {
    await $`mkdir ${dir}/a`;
    assert(dir.join("a").existsSync());

    {
      const error = await $`mkdir ${dir}/a`.noThrow().stderr("piped").spawn()
        .then(
          (r) => r.stderr,
        );
      const expecteError = "mkdir: cannot create directory";
      assertEquals(error.slice(0, expecteError.length), expecteError);
    }

    {
      const error = await $`mkdir ${dir}/b/c`.noThrow().stderr("piped").spawn()
        .then(
          (r) => r.stderr,
        );
      const expectedError = isNode
        ? "mkdir: no such file or directory, mkdir"
        : Deno.build.os === "windows"
        ? "mkdir: The system cannot find the path specified."
        : "mkdir: No such file or directory";
      assertEquals(error.slice(0, expectedError.length), expectedError);
    }

    await $`mkdir -p ${dir}/b/c`;
    assert(await dir.join("b/c").exists());
  });
});

Deno.test("copy test", async () => {
  await withTempDir(async (dir) => {
    const file1 = dir.join("file1.txt");
    const file2 = dir.join("file2.txt");
    file1.writeTextSync("test");
    await $`cp ${file1} ${file2}`;

    assert(file1.existsSync());
    assert(file2.existsSync());

    const destDir = dir.join("dest");
    destDir.mkdirSync();
    await $`cp ${file1} ${file2} ${destDir}`;

    assert(file1.existsSync());
    assert(file2.existsSync());
    assert(destDir.join("file1.txt").existsSync());
    assert(destDir.join("file2.txt").existsSync());

    const newFile = dir.join("new.txt");
    newFile.writeTextSync("test");
    await $`cp ${newFile} ${destDir}`;

    assert(destDir.isDirSync());
    assert(newFile.existsSync());
    assert(destDir.join("new.txt").existsSync());

    assertEquals(
      await getStdErr($`cp ${file1} ${file2} non-existent`),
      "cp: target 'non-existent' is not a directory\n",
    );

    assertEquals(await getStdErr($`cp`), "cp: missing file operand\n");
    assertStringIncludes(await getStdErr($`cp ${file1}`), "cp: missing destination file operand after");

    assertEquals(await getStdErr($`cp`), "cp: missing file operand\n");
    assertStringIncludes(await getStdErr($`cp ${file1}`), "cp: missing destination file operand after");

    // recursive test
    destDir.join("sub_dir").mkdirSync();
    destDir.join("sub_dir", "sub.txt").writeTextSync("test");
    const destDir2 = dir.join("dest2");

    assertEquals(await getStdErr($`cp ${destDir} ${destDir2}`), "cp: source was a directory; maybe specify -r\n");
    assert(!destDir2.existsSync());

    await $`cp -r ${destDir} ${destDir2}`;
    assert(destDir2.existsSync());
    assert(destDir2.join("file1.txt").existsSync());
    assert(destDir2.join("file2.txt").existsSync());
    assert(destDir2.join("sub_dir", "sub.txt").existsSync());

    // copy again
    await $`cp -r ${destDir} ${destDir2}`;

    // try copying to a file
    assertStringIncludes(await getStdErr($`cp -r ${destDir} ${destDir2}/file1.txt`), "destination was a file");
  });
});

Deno.test("cp test2", async () => {
  await withTempDir(async (dir) => {
    await $`mkdir -p a/d1`;
    await $`mkdir -p a/d2`;
    await Deno.create("a/d1/f").then((f) => f.close());
    await $`cp a/d1/f a/d2`;
    assert(dir.join("a/d2/f").existsSync());
  });
});

Deno.test("move test", async () => {
  await withTempDir(async (dir) => {
    const file1 = dir.join("file1.txt");
    const file2 = dir.join("file2.txt");
    file1.writeTextSync("test");

    await $`mv ${file1} ${file2}`;
    assert(!file1.existsSync());
    assert(file2.existsSync());

    const destDir = dir.join("dest");
    file1.writeTextSync("test"); // recreate
    destDir.mkdirSync();
    await $`mv ${file1} ${file2} ${destDir}`;
    assert(!file1.existsSync());
    assert(!file2.existsSync());
    assert(destDir.join("file1.txt").existsSync());
    assert(destDir.join("file2.txt").existsSync());

    const newFile = dir.join("new.txt");
    newFile.writeTextSync("test");
    await $`mv ${newFile} ${destDir}`;
    assert(destDir.isDirSync());
    assert(!newFile.existsSync());
    assert(destDir.join("new.txt").existsSync());

    assertEquals(
      await getStdErr($`mv ${file1} ${file2} non-existent`),
      "mv: target 'non-existent' is not a directory\n",
    );

    assertEquals(await getStdErr($`mv`), "mv: missing operand\n");
    assertStringIncludes(await getStdErr($`mv ${file1}`), "mv: missing destination file operand after");
  });
});

Deno.test("pwd: pwd", async () => {
  assertEquals(await $`pwd`.text(), Deno.cwd());
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

async function getStdErr(cmd: CommandBuilder) {
  return await cmd.noThrow().stderr("piped").then((r) => r.stderr);
}

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

Deno.test("touch test", async () => {
  await withTempDir(async (dir) => {
    await $`touch a`;
    assert(dir.join("a").existsSync());
    await $`touch a`;
    assert(dir.join("a").existsSync());

    await $`touch b c`;
    assert(dir.join("b").existsSync());
    assert(dir.join("c").existsSync());

    await $`mkdir subdir && cd subdir && touch a`;
    assert(dir.join("subdir/a").existsSync());

    assertEquals(await getStdErr($`touch`), "touch: missing file operand\n");

    assertEquals(await getStdErr($`touch --test hello`), "touch: unsupported flag: --test\n");
  });
});

Deno.test("cd", () => {
  const cwd = Deno.cwd();

  try {
    $.cd("./src");
    assert(Deno.cwd().endsWith("src"));
    // todo: this originally passed in import.meta, but that
    // didn't work in the node cjs tests, so now it's doing this
    // thing that doesn't really test it
    $.cd($.path(new URL(import.meta.url)).parentOrThrow());
    $.cd("./src");
    assert(Deno.cwd().endsWith("src"));
    const path = $.path(import.meta.url).parentOrThrow();
    $.cd(path);
    $.cd("./src");
    assert(Deno.cwd().endsWith("src"));
  } finally {
    Deno.chdir(cwd);
  }
});

Deno.test("cat", async () => {
  await withTempDir(async (tempDir) => {
    await Deno.writeTextFile("hello", "hello world");
    assertEquals(
      await $`cat hello`.text(),
      "hello world",
    );
    assertEquals(
      // absolute path
      await $`cat ${tempDir.join("hello")}`.text(),
      "hello world",
    );
    await Deno.writeTextFile("hello2", "hello world2");
    assertEquals(
      await $`cat hello hello2`.text(),
      "hello worldhello world2",
    );
    assertEquals(
      await $`cat`.stdinText("helloz").text(),
      "helloz",
    );
    assertEquals(
      await $`cat -`.stdinText("helloz").text(),
      "helloz",
    );
    assertEquals(
      await $`cat hello - hello2`.stdinText("helloz").text(),
      "hello worldhellozhello world2",
    );
    {
      const result = await $`cat -`.stderr("piped").noThrow();
      assertEquals(result.code, 1);
      assertEquals(result.stderr, "cat: not supported. stdin was 'inherit'\n");
    }
    {
      const result = await $`cat -`.stdin("null").stderr("piped").noThrow();
      assertEquals(result.code, 1);
      assertEquals(result.stderr, "cat: not supported. stdin was 'null'\n");
    }
  });
});

Deno.test("printenv", async () => {
  {
    const result = await $`printenv`.env("hello", "world").env("ab", "cd").text();
    if (Deno.build.os === "windows") {
      assertMatch(result, /HELLO=world/);
      assertMatch(result, /AB=cd/);
    } else {
      assertMatch(result, /hello=world/);
      assertMatch(result, /ab=cd/);
    }
  }
  {
    const result = await $`printenv hello ab`.env("hello", "world").env("ab", "cd").stdout("piped");
    assertEquals(result.code, 0);
    assertEquals(result.stdout, "world\ncd\n");
  }
  if (Deno.build.os === "windows") {
    // windows is case insensitive
    const result = await $`printenv HeLlO aB`.env("hello", "world").env("ab", "cd").stdout("piped");
    assertEquals(result.code, 0);
    assertEquals(result.stdout, "world\ncd\n");
  }
  {
    const result = await $`printenv hello doesntExist`.env("hello", "world").env("ab", "cd").noThrow().stdout("piped");
    assertEquals(result.code, 1);
    assertEquals(result.stdout, "world\n");
  }
});

Deno.test("should give nice error message when cwd directory does not exist", async () => {
  await assertRejects(
    async () => {
      await $`deno eval 'console.log(5)'`.cwd("./non_existent/directory");
    },
    Error,
    "Failed to launch command because the cwd does not exist",
  );
});

Deno.test("should error creating a command signal", () => {
  assertThrows(
    () => {
      new (KillSignal as any)();
    },
    Error,
    "Constructing instances of KillSignal is not permitted.",
  );
});

Deno.test("should receive signal when listening", { ignore: Deno.build.os !== "linux" }, async () => {
  const p =
    $`deno eval 'Deno.addSignalListener("SIGINT", () => console.log("RECEIVED SIGINT")); console.log("started"); setTimeout(() => {}, 10_000)'`
      .noThrow()
      .stdout("piped")
      .spawn();
  await $.sleep(60);
  p.kill("SIGINT");
  await $.sleep(30);
  // now terminate it
  p.kill("SIGKILL");
  assertEquals((await p).stdout, "started\nRECEIVED SIGINT\n");
});

Deno.test("signal listening in registered commands", async () => {
  const commandBuilder = new CommandBuilder().noThrow().registerCommand("listen", (handler) => {
    return new Promise((resolve) => {
      function listener(signal: Deno.Signal) {
        if (signal === "SIGKILL") {
          resolve({
            code: 135,
          });
          handler.signal.removeListener(listener);
        } else {
          handler.stderr.writeLine(signal);
        }
      }

      handler.signal.addListener(listener);
    });
  });
  const $ = build$({ commandBuilder });

  {
    const child = $`listen`.stderr("piped").spawn();
    await $.sleep(5); // let the command start up
    child.kill("SIGINT");
    child.kill("SIGBREAK");
    child.kill("SIGKILL");

    const result = await child;
    assertEquals(result.code, 135);
    assertEquals(result.stderr, "SIGINT\nSIGBREAK\n");
  }

  {
    // now try killing while running and having a command launch afterwards on failure
    const child = $`listen || echo 1`.stderr("piped").spawn();
    await $.sleep(5); // let the command start up
    child.kill("SIGINT");
    child.kill("SIGBREAK");
    child.kill("SIGKILL");

    const result = await child;
    // exit code should be the abort code in this case because it tried
    // to launch `echo 1` after the command was killed
    assertEquals(result.code, 124);
    assertEquals(result.stderr, "SIGINT\nSIGBREAK\n");
  }
});

Deno.test("should support setting a command signal", async () => {
  const controller = new KillSignalController();
  const commandBuilder = new CommandBuilder().signal(controller.signal).noThrow();
  const $ = build$({ commandBuilder });
  const startTime = new Date().getTime();

  const processes = [
    $`sleep 100s`.spawn(),
    $`sleep 100s`.spawn(),
    $`sleep 100s`.spawn(),
    // this will be triggered as well because this signal
    // will be linked to the parent signal
    $`sleep 100s`.signal(new KillSignalController().signal),
  ];

  const subController = new KillSignalController();
  const p = $`sleep 100s`.signal(subController.signal).spawn();

  await $.sleep("5ms");

  subController.kill();

  await p;

  const restPromise = Promise.all(processes);
  await ensurePromiseNotResolved(restPromise);

  controller.kill();

  await restPromise;
  const endTime = new Date().getTime();
  assert(endTime - startTime < 1000);
});

Deno.test("ensure KillSignalController readme example works", async () => {
  const controller = new KillSignalController();
  const signal = controller.signal;
  const startTime = new Date().getTime();

  const promise = Promise.all([
    $`sleep 1000s`.signal(signal),
    $`sleep 2000s`.signal(signal),
    $`sleep 3000s`.signal(signal),
  ]);

  $.sleep("5ms").then(() => controller.kill("SIGKILL"));

  await assertRejects(() => promise, Error, "Aborted with exit code: 124");
  const endTime = new Date().getTime();
  assert(endTime - startTime < 1000);
});

Deno.test("should support empty quoted string", async () => {
  const output = await $`echo '' test ''`.text();
  assertEquals(output, " test ");
});

Deno.test("ensure deprecated PathRef export still works", () => {
  const path = new PathRef("hello");
  assert(path instanceof Path);
  assert(path instanceof PathRef);
});

Deno.test("nice error message when not awaiting a CommandBuilder", async () => {
  await assertRejects(
    async () => {
      const cmd = $`echo 1`;
      return await $`echo ${cmd}`;
    },
    Error,
    "Providing a command builder is not yet supported (https://github.com/dsherret/dax/issues/239). " +
      "Await the command builder's text before using it in an expression (ex. await $`cmd`.text()).",
  );
});

Deno.test("which uses same as $.which", async () => {
  {
    const whichFnOutput = await $.which("deno");
    const whichShellOutput = await $`which deno`.text();
    if (Deno.build.os === "windows") {
      // windows is case insensitive
      assertEquals(whichFnOutput?.toLowerCase(), whichShellOutput.toLowerCase());
    } else {
      assertEquals(whichFnOutput, whichShellOutput);
    }
  }
  // arg not found
  {
    const whichShellOutput = await $`which non-existent-command-that-not-exists`
      .noThrow()
      .stderr("piped")
      .stdout("piped");
    assertEquals(whichShellOutput.stderr, "");
    assertEquals(whichShellOutput.stdout, "");
    assertEquals(whichShellOutput.code, 1);
  }
  // invalid args
  {
    const whichShellOutput = await $`which deno test`
      .noThrow()
      .stderr("piped")
      .stdout("piped");
    assertEquals(whichShellOutput.stderr, "which: unsupported too many arguments\n");
    assertEquals(whichShellOutput.stdout, "");
    assertEquals(whichShellOutput.code, 2);
  }
  // invalid arg kind
  {
    const whichShellOutput = await $`which -h`
      .noThrow()
      .stderr("piped")
      .stdout("piped");
    assertEquals(whichShellOutput.stderr, "which: unsupported flag: -h\n");
    assertEquals(whichShellOutput.stdout, "");
    assertEquals(whichShellOutput.code, 2);
  }
});

Deno.test("expect error undefined", async () => {
  await assertRejects(async () => {
    // @ts-expect-error undefined not assignable
    await $`echo ${undefined}`;
  });
  await assertRejects(async () => {
    // @ts-expect-error null not assignable
    await $`echo ${null}`;
  });
});

Deno.test("resolve command by path", async () => {
  const version = await $`${Deno.execPath()} --version`.text();
  assert(typeof version === "string");
});

function ensurePromiseNotResolved(promise: Promise<unknown>) {
  return new Promise<void>((resolve, reject) => {
    promise.then(() => reject(new Error("Promise was resolved")));
    setTimeout(resolve, 1);
  });
}
