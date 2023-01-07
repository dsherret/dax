import $, { build$, CommandBuilder, CommandContext, CommandHandler } from "./mod.ts";
import { lstat, rustJoin } from "./src/common.ts";
import { assert, assertEquals, assertRejects, assertStringIncludes, assertThrows } from "./src/deps.test.ts";
import { Buffer, colors, path } from "./src/deps.ts";

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

Deno.test("should not get stderr when inherited only (default)", async () => {
  const output = await $`deno eval 'console.error("should output");'`;
  assertEquals(output.code, 0);
  assertThrows(
    () => output.stderr,
    Error,
    `Stderr was not piped (was inherit). Call .stderr("piped") or .stderr("capture") on the process.`,
  );
});

Deno.test("should not get stderr when null", async () => {
  const output = await $`deno eval 'console.error(5);'`.stderr("null");
  assertEquals(output.code, 0);
  assertThrows(
    () => output.stderr,
    Error,
    `Stderr was not piped (was null). Call .stderr("piped") or .stderr("capture") on the process.`,
  );
});

Deno.test("should capture stderr when piped", async () => {
  const output = await $`deno eval 'console.error(5);'`.stderr("piped");
  assertEquals(output.code, 0);
  assertEquals(output.stderr, "5\n");
});

Deno.test("should capture stderr when inherited and piped", async () => {
  const output = await $`deno eval 'console.error(5);'`.stderr("inheritPiped");
  assertEquals(output.code, 0);
  assertEquals(output.stderr, "5\n");
});

Deno.test("should get combined stdout and stderr when both piped", async () => {
  const output = await $`echo 1 ; sleep 0.5 ; deno eval 'console.error(2);'`.stdout("piped").stderr("piped");
  assertEquals(output.code, 0);
  assertEquals(output.combined, "1\n2\n");
});

Deno.test("should not get combined stdout and stderr when stdout is inherited (default)", async () => {
  const output = await $`deno eval 'console.error("should output");'`;
  assertEquals(output.code, 0);
  assertThrows(
    () => output.combined,
    Error,
    `Stdout was not piped (was inherit). Call .stdout("piped") or .stdout("capture") on the process.`,
  );
});

Deno.test("should not get combined stdout and stderr when stderr is inherited", async () => {
  const output = await $`deno eval 'console.error("should output");'`.stdout("piped");
  assertEquals(output.code, 0);
  assertThrows(
    () => output.combined,
    Error,
    `Stderr was not piped (was inherit). Call .stderr("piped") or .stderr("capture") on the process.`,
  );
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

Deno.test("stderrJson", async () => {
  const output = await $`deno eval "console.error(JSON.stringify({ test: 5 }));"`.stderr("piped");
  assertEquals(output.stderrJson, { test: 5 });
  assertEquals(output.stderrJson === output.stderrJson, true); // should be memoized
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
    .registerCommand("zardoz-speaks", (context) => {
      if (context.args.length != 1) {
        context.stderr.writeLine("zardoz-speaks: expected 1 argument");
        return {
          kind: "continue",
          code: 1,
        };
      }
      context.stdout.writeLine(`zardoz speaks to ${context.args[0]}`);
      return {
        kind: "continue",
        code: 0,
      };
    })
    .registerCommands({
      "true": () => Promise.resolve({ kind: "continue", code: 0 }),
      "false": () => Promise.resolve({ kind: "continue", code: 1 }),
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
      kind: "continue",
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
  await assertRejects(
    async () => await builder.command("export somewhere"),
    Error,
    "Command not found: export",
  );
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

Deno.test("cwd should be resolved based on cwd at time of method call and not execution", async () => {
  const previousCwd = Deno.cwd();
  try {
    const command = $`echo $PWD`.cwd("./src");
    Deno.chdir("./src/rs_lib");
    const result = await command.text();
    assertEquals(result.slice(-3), "src");
  } finally {
    Deno.chdir(previousCwd);
  }
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
  const command = $`deno eval 'await new Promise(resolve => setTimeout(resolve, 1_000));'`
    .timeout(200);
  await assertRejects(async () => await command, Error, "Timed out with exit code: 124");

  const result = await command.noThrow();
  assertEquals(result.code, 124);
});

Deno.test("piping to stdin", async () => {
  // Deno.Reader
  {
    const bytes = new TextEncoder().encode("test\n");
    const result =
      await $`deno eval "const b = new Uint8Array(4); await Deno.stdin.read(b); await Deno.stdout.write(b);"`
        .stdin(new Buffer(bytes))
        .text();
    assertEquals(result, "test");
  }

  // string
  {
    const result =
      await $`deno eval "const b = new Uint8Array(4); await Deno.stdin.read(b); await Deno.stdout.write(b);"`
        .stdin("test\n")
        .text();
    assertEquals(result, "test");
  }

  // Uint8Array
  {
    const result =
      await $`deno eval "const b = new Uint8Array(4); await Deno.stdin.read(b); await Deno.stdout.write(b);"`
        .stdin(new TextEncoder().encode("test\n"))
        .text();
    assertEquals(result, "test");
  }
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
      await Deno.writeTextFile(
        $.path.join(dir, "file.ts"),
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
      await Deno.writeTextFile(
        $.path.join(dir, "file2.ts"),
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
        "Command not found: deno run",
      );
    });

    step("without -S, but valid", async () => {
      await Deno.writeTextFile(
        $.path.join(dir, "echo_stdin.ts"),
        [
          "#!/usr/bin/env -S deno run --unstable --allow-run",
          "await new Deno.Command('deno', { args: ['run', ...Deno.args] }).spawn();",
        ].join("\n"),
      );
      await Deno.writeTextFile(
        $.path.join(dir, "file3.ts"),
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
    const emptyDir = dir + "/hello";
    const someFile = dir + "/a.txt";

    Deno.mkdirSync(emptyDir);
    Deno.writeTextFileSync(someFile, "");

    await $`rm ${emptyDir}`;
    await $`rm ${someFile}`;
    assertEquals($.existsSync(dir + "/hello"), false);
    assertEquals($.existsSync(dir + "/a.txt"), false);

    const nonEmptyDir = dir + "/a";
    Deno.mkdirSync(nonEmptyDir + "/b", { recursive: true });

    const error = await $`rm ${nonEmptyDir}`.noThrow().stderr("piped").spawn()
      .then((r) => r.stderr);
    const expectedText = Deno.build.os === "linux" || Deno.build.os === "darwin"
      ? "rm: Directory not empty"
      : "rm: The directory is not empty";
    assertEquals(error.substring(0, expectedText.length), expectedText);

    await $`rm -r ${nonEmptyDir}`;
    assertEquals($.existsSync(nonEmptyDir), false);
  });
});

async function withTempDir(action: (path: string) => Promise<void>) {
  const dirPath = Deno.makeTempDirSync();
  try {
    await action(dirPath);
  } finally {
    try {
      await Deno.remove(dirPath, { recursive: true });
    } catch {
      // ignore
    }
  }
}

Deno.test("test mkdir", async () => {
  await withTempDir(async (dir) => {
    await $`mkdir ${dir}/a`;
    await $.exists(dir + "/a");

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
      const expectedError = Deno.build.os === "windows"
        ? "mkdir: The system cannot find the path specified."
        : "mkdir: No such file or directory";
      assertEquals(error.slice(0, expectedError.length), expectedError);
    }

    await $`mkdir -p ${dir}/b/c`;
    assert(await $.exists(dir + "/b/c"));
  });
});

Deno.test("copy test", async () => {
  await withTempDir(async (dir) => {
    const file1 = path.join(dir, "file1.txt");
    const file2 = path.join(dir, "file2.txt");
    Deno.writeTextFileSync(file1, "test");
    await $`cp ${file1} ${file2}`;

    assert($.existsSync(file1));
    assert($.existsSync(file2));

    const destDir = path.join(dir, "dest");
    Deno.mkdirSync(destDir);
    await $`cp ${file1} ${file2} ${destDir}`;

    assert($.existsSync(file1));
    assert($.existsSync(file2));
    assert($.existsSync(rustJoin(destDir, file1)));
    assert($.existsSync(rustJoin(destDir, file2)));

    const newFile = path.join(dir, "new.txt");
    Deno.writeTextFileSync(newFile, "test");
    await $`cp ${newFile} ${destDir}`;

    assert(await isDir(destDir));
    assert($.existsSync(newFile));
    assert($.existsSync(rustJoin(destDir, newFile)));

    assertEquals(
      await getStdErr($`cp ${file1} ${file2} non-existent`),
      "cp: target 'non-existent' is not a directory\n",
    );

    assertEquals(await getStdErr($`cp "" ""`), "cp: missing file operand\n");
    assertStringIncludes(await getStdErr($`cp ${file1} ""`), "cp: missing destination file operand after");

    // recursive test
    Deno.mkdirSync(path.join(destDir, "sub_dir"));
    Deno.writeTextFileSync(path.join(destDir, "sub_dir", "sub.txt"), "test");
    const destDir2 = path.join(dir, "dest2");

    assertEquals(await getStdErr($`cp ${destDir} ${destDir2}`), "cp: source was a directory; maybe specify -r\n");
    assert(!$.existsSync(destDir2));

    await $`cp -r ${destDir} ${destDir2}`;
    assert($.existsSync(destDir2));
    assert($.existsSync(path.join(destDir2, "file1.txt")));
    assert($.existsSync(path.join(destDir2, "file2.txt")));
    assert($.existsSync(path.join(destDir2, "sub_dir", "sub.txt")));

    // copy again
    await $`cp -r ${destDir} ${destDir2}`;

    // try copying to a file
    assertStringIncludes(await getStdErr($`cp -r ${destDir} ${destDir2}/file1.txt`), "destination was a file");
  });
});

Deno.test("move test", async () => {
  await withTempDir(async (dir) => {
    const file1 = path.join(dir, "file1.txt");
    const file2 = path.join(dir, "file2.txt");
    Deno.writeTextFileSync(file1, "test");

    await $`mv ${file1} ${file2}`;
    assert(!$.existsSync(file1));
    assert($.existsSync(file2));

    const destDir = path.join(dir, "dest");
    Deno.writeTextFileSync(file1, "test"); // recreate
    Deno.mkdirSync(destDir);
    await $`mv ${file1} ${file2} ${destDir}`;
    assert(!$.existsSync(file1));
    assert(!$.existsSync(file2));
    assert($.existsSync(rustJoin(destDir, file2)));
    assert($.existsSync(rustJoin(destDir, file2)));

    const newFile = path.join(dir, "new.txt");
    Deno.writeTextFileSync(newFile, "test");
    await $`mv ${newFile} ${destDir}`;
    assert(await isDir(destDir));
    assert(!$.existsSync(newFile));
    assert($.existsSync(path.join(destDir, "new.txt")));

    assertEquals(
      await getStdErr($`mv ${file1} ${file2} non-existent`),
      "mv: target 'non-existent' is not a directory\n",
    );

    assertEquals(await getStdErr($`mv "" ""`), "mv: missing operand\n");
    assertStringIncludes(await getStdErr($`mv ${file1} ""`), "mv: missing destination file operand after");
  });
});

Deno.test("pwd: pwd", async () => {
  assertEquals(await $`pwd`.text(), Deno.cwd());
});

Deno.test("progress", async () => {
  const logs: string[] = [];
  $.setInfoLogger((...data) => logs.push(data.join(" ")));
  const pb = $.progress("Downloading Test");
  await pb.forceRender(); // should not throw;
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

async function isDir(path: string) {
  const info = await lstat(path);
  return info?.isDirectory ? true : false;
}

Deno.test("$.commandExists", async () => {
  assertEquals(await $.commandExists("some-fake-command"), false);
  assertEquals(await $.commandExists("deno"), true);

  const $new = build$({
    commandBuilder: new CommandBuilder().registerCommand("some-fake-command", () => {
      return Promise.resolve({ code: 0, kind: "continue" });
    }),
  });
  assertEquals(await $new.commandExists("some-fake-command"), true);
});

Deno.test("$.commandExistsSync", () => {
  assertEquals($.commandExistsSync("some-fake-command"), false);
  assertEquals($.commandExistsSync("deno"), true);

  const $new = build$({
    commandBuilder: new CommandBuilder().registerCommand("some-fake-command", () => {
      return Promise.resolve({ code: 0, kind: "continue" });
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
