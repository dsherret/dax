import $, { CommandBuilder } from "./mod.ts";
import { assertEquals, assertRejects, assertThrows } from "./src/deps.test.ts";
import { path } from "./src/deps.ts";

Deno.test("should get stdout by default", async () => {
  const output = await $`echo 5`;
  assertEquals(output.code, 0);
  assertEquals(output.stdout, "5\n");
});

Deno.test("should not get stdout when inherited", async () => {
  const output = await $`echo "should output"`.stdout("inherit");
  assertEquals(output.code, 0);
  assertThrows(() => output.stdout, Error, `Stdout was not piped (was inherit).`);
});

Deno.test("should not get stdout when null", async () => {
  const output = await $`echo 5`.stdout("null");
  assertEquals(output.code, 0);
  assertThrows(() => output.stdout, Error, `Stdout was not piped (was null).`);
});

Deno.test("should capture stderr by default", async () => {
  const output = await $`deno eval 'console.error(5);'`;
  assertEquals(output.code, 0);
  assertEquals(output.stderr, "5\n");
});

Deno.test("should not get stderr when inherited only", async () => {
  const output = await $`deno eval 'console.error("should output");'`.stderr("inherit");
  assertEquals(output.code, 0);
  assertThrows(() => output.stderr, Error, `Stderr was not piped (was inherit). Call .stderr("pipe") on the process.`);
});

Deno.test("should not get stderr when null", async () => {
  const output = await $`deno eval 'console.error(5);'`.stderr("null");
  assertEquals(output.code, 0);
  assertThrows(() => output.stderr, Error, `Stderr was not piped (was null). Call .stderr("pipe") on the process.`);
});

Deno.test("should capture stderr when piped", async () => {
  const output = await $`deno eval 'console.error(5);'`.stderr("piped");
  assertEquals(output.code, 0);
  assertEquals(output.stderr, "5\n");
});

Deno.test("should throw when exit code is non-zero", async () => {
  await assertRejects(
    async () => {
      await $`deno eval 'Deno.exit(1);'`;
    },
    Error,
    "Exited with error code: 1",
  );

  await assertRejects(
    async () => {
      await $`deno eval 'Deno.exit(2);'`;
    },
    Error,
    "Exited with error code: 2",
  );
});

Deno.test("should change the cwd, but only in the shell", async () => {
  const output = await $`cd src ; deno eval 'console.log(Deno.cwd());'`;
  const standardizedOutput = output.stdout.trim().replace(/\\/g, "/");
  assertEquals(standardizedOutput.endsWith("src"), true, standardizedOutput);
});

Deno.test("allow setting env", async () => {
  const output = await $`echo $test`.env("test", "123");
  assertEquals(output.stdout.trim(), "123");
});

Deno.test("allow setting multiple env", async () => {
  const output = await $`echo $test$other`.env({
    test: "123",
    other: "456",
  });
  assertEquals(output.stdout.trim(), "123456");
});

Deno.test("set var for command", async () => {
  const output = await $`test=123 echo $test ; echo $test`
    .env("test", "456");
  assertEquals(output.stdout, "123\n456\n");
});

Deno.test("variable substitution", async () => {
  const output = await $`deno eval "console.log($TEST);"`.env("TEST", "123");
  assertEquals(output.stdout.trim(), "123");
});

Deno.test("stdoutJson", async () => {
  const output = await $`deno eval "console.log(JSON.stringify({ test: 5 }));"`;
  assertEquals(output.stdoutJson, { test: 5 });
  assertEquals(output.stdoutJson === output.stdoutJson, true); // should be memoized
});

Deno.test("stderrJson", async () => {
  const output = await $`deno eval "console.error(JSON.stringify({ test: 5 }));"`.stderr("piped");
  assertEquals(output.stderrJson, { test: 5 });
  assertEquals(output.stderrJson === output.stderrJson, true); // should be memoized
});

Deno.test("should handle interpolation", async () => {
  const output = await $`deno eval 'console.log(${5});'`;
  assertEquals(output.code, 0);
  assertEquals(output.stdout, "5\n");
});

Deno.test("command builder should build", async () => {
  const builder = new CommandBuilder()
    .env("TEST", "123");
  {
    const $ = builder.build$();
    // after creating a $, the environment should be set in stone, so changing
    // this environment variable should have no effect here
    builder.env("TEST", "456");
    const output = await $`deno eval 'console.log(Deno.env.get("TEST"));'`;
    assertEquals(output.code, 0);
    assertEquals(output.stdout, "123\n");
  }

  {
    // but this one should be
    const $ = builder.build$();
    const output = await $`deno eval 'console.log(Deno.env.get("TEST"));'`;
    assertEquals(output.code, 0);
    assertEquals(output.stdout, "456\n");
  }
});

Deno.test("should handle boolean list 'or'", async () => {
  {
    const output = await $`deno eval 'Deno.exit(1)' || deno eval 'console.log(5)'`;
    assertEquals(output.stdout.trim(), "5");
  }
  {
    const output = await $`deno eval 'Deno.exit(1)' || deno eval 'Deno.exit(2)' || deno eval 'Deno.exit(3)'`.noThrow();
    assertEquals(output.stdout, "");
    assertEquals(output.code, 3);
  }
});

Deno.test("should handle boolean list 'and'", async () => {
  {
    const output = await $`deno eval 'Deno.exit(5)' && echo 2`.noThrow();
    assertEquals(output.code, 5);
    assertEquals(output.stdout, "");
  }
  {
    const output = await $`deno eval 'Deno.exit(0)' && echo 5 && echo 6`;
    assertEquals(output.code, 0);
    assertEquals(output.stdout.trim(), "5\n6");
  }
});

Deno.test("should provide result from one command to another", async () => {
  const result = await $`echo 1`;
  const result2 = await $`echo ${result}`;
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

Deno.test("should handle the PWD variable", async () => {
  const srcDir = path.resolve("./src");
  {
    const output = await $`cd src && echo $PWD `;
    assertEquals(output.stdout.trim(), srcDir);
  }
  {
    // changing PWD should affect this
    const output = await $`PWD=$PWD/src && echo $PWD `;
    assertEquals(output.stdout.trim(), srcDir);
  }
});
