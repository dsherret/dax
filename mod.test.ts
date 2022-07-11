import $ from "./mod.ts";
import { assertEquals, assertRejects, assertThrows } from "./src/deps.test.ts";

Deno.test("should get stdout by default", async () => {
  const output = await $`deno eval 'console.log(5);'`;
  assertEquals(output.code, 0);
  assertEquals(output.stdout, "5\n");
});

Deno.test("should not get stdout when inherited", async () => {
  const output = await $`deno eval 'console.log("should output")'`.stdout("inherit");
  assertEquals(output.code, 0);
  assertThrows(() => output.stdout, Error, `Stdout was not piped (was inherit).`);
});

Deno.test("should not get stdout when null", async () => {
  const output = await $`deno eval 'console.log(5);'`.stdout("null");
  assertEquals(output.code, 0);
  assertThrows(() => output.stdout, Error, `Stdout was not piped (was null).`);
});

Deno.test("should not get stderr by default", async () => {
  const output = await $`deno eval 'console.error("should output");'`;
  assertEquals(output.code, 0);
  assertThrows(() => output.stderr, Error, `Stderr was not piped (was inherit). Call .stderr("pipe") on the process.`);
});

Deno.test("should not get stderr when null", async () => {
  const output = await $`deno eval 'console.log(5);'`.stderr("null");
  assertEquals(output.code, 0);
  assertThrows(() => output.stderr, Error, `Stderr was not piped (was null). Call .stderr("pipe") on the process.`);
});

Deno.test("should capture stderr when piped", async () => {
  const output = await $`deno eval 'console.error(5);'`.stderr("pipe");
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
  const output = await $`deno eval 'console.log(Deno.env.get("test"));'`.env("test", "123");
  assertEquals(output.stdout.trim(), "123");
});

Deno.test("allow setting multiple env", async () => {
  const output = await $`deno eval 'console.log(Deno.env.get("test") + Deno.env.get("other"));'`.env({
    test: "123",
    other: "456",
  });
  assertEquals(output.stdout.trim(), "123456");
});

Deno.test("set var for command", async () => {
  const output = await $
    `test=123 deno eval 'console.log(Deno.env.get("test"));' ; deno eval 'console.log(Deno.env.get("test"));'`
    .env("test", "456");
  assertEquals(output.stdout.trim(), "123\n456");
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
  const output = await $`deno eval "console.error(JSON.stringify({ test: 5 }));"`.stderr("pipe");
  assertEquals(output.stderrJson, { test: 5 });
  assertEquals(output.stderrJson === output.stderrJson, true); // should be memoized
});
