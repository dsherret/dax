import { assertExists } from "https://deno.land/std@0.147.0/testing/asserts.ts";
import $, { build$, CommandBuilder } from "./mod.ts";
import { assertEquals, assertRejects, assertThrows } from "./src/deps.test.ts";
import { Buffer, fs, path, which } from "./src/deps.ts";

Deno.test("should get stdout by default", async () => {
  const output = await $`echo 5`;
  assertEquals(output.code, 0);
  assertEquals(output.stdout, "5\n");
});

Deno.test("should escape arguments", async () => {
  const text = await $`echo ${"testing 'this $TEST \`out"}`.text();
  assertEquals(text, "testing 'this $TEST `out");
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
  const output = await $`deno eval 'console.log(${5});'`;
  assertEquals(output.code, 0);
  assertEquals(output.stdout, "5\n");
});

Deno.test("command builder should build", async () => {
  const commandBuilder = new CommandBuilder()
    .env("TEST", "123");
  {
    const $ = build$({ commandBuilder });
    // after creating a $, the environment should be set in stone, so changing
    // this environment variable should have no effect here. Additionally,
    // command builders are immutable and return a new builder each time
    commandBuilder.env("TEST", "456");
    const output = await $`deno eval 'console.log(Deno.env.get("TEST"));'`;
    assertEquals(output.code, 0);
    assertEquals(output.stdout, "123\n");
  }

  {
    // this one additionally won't be affected because command builders are immutable
    const $ = build$({ commandBuilder });
    const output = await $`deno eval 'console.log(Deno.env.get("TEST"));'`;
    assertEquals(output.code, 0);
    assertEquals(output.stdout, "123\n");
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

Deno.test("sleep command", async () => {
  const start = performance.now();
  const result = await $`sleep 0.2 && echo 1`.text();
  const end = performance.now();
  assertEquals(result, "1");
  assertEquals(end - start > 190, true);
});

Deno.test("test command", async (t) => {
  await Deno.writeFile('zero.dat', new Uint8Array());
  await Deno.writeFile('non-zero.dat', new Uint8Array([242]));
  //await Deno.symlink('zero.dat', 'linked.dat');
  
  await t.step("test -e", async () => {
    const result = await $`test -e zero.dat`.noThrow();
    assertEquals(result.code, 0);
  });
  await t.step("test -f", async () => {
    const result = await $`test -f zero.dat`.noThrow();
    assertEquals(result.code, 0, "should be a file");
  });
  await t.step("test -f on non-file", async () => {
    const result = await $`test -f ${Deno.cwd()}`.noThrow();
    assertEquals(result.code, 1, "should not be a file");
    assertEquals(result.stderr, "");
  });
  await t.step("test -d", async() => {
    const result = await $`test -d ${Deno.cwd()}`.noThrow();
    assertEquals(result.code, 0, `${Deno.cwd()} should be a directory`);
  });
  await t.step("test -d on non-directory", async() => {
    const result = await $`test -d zero.dat`.noThrow();
    assertEquals(result.code, 1, "should not be a directory");
    assertEquals(result.stderr, "");
  });
  await t.step("test -s", async () => {
    const result = await $`test -s non-zero.dat`.noThrow();
    assertEquals(result.code, 0, "should be > 0");
    assertEquals(result.stderr, "");
  });
  await t.step("test -s on zero-length file", async () => {
    const result = await $`test -s zero.dat`.noThrow();
    assertEquals(result.code, 1, "should fail as file is zero-sized");
    assertEquals(result.stderr, "");
  });
  // await t.step("test -L", async () => {
  //   const result = await $`test -L linked.dat`.noThrow();
  //   assertEquals(result.code, 0, "should be a symlink");
  // });
  // await t.step("test -L on a non-symlink", async () => {
  //   const result = await $`test -L zero.dat`.noThrow();
  //   assertEquals(result.code, 1, "should fail as not a symlink");
  //   assertEquals(result.stderr, "");    
  // });
  
  // await Deno.remove('linked.dat');
  await Deno.remove('zero.dat');
  await Deno.remove('non-zero.dat');
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
    .command(["echo", input]);
  assertEquals(result.stdout.trim(), input);
  // should be properly escaped here too
  assertEquals(await $`echo ${result}`.text(), input);
});

Deno.test("command .lines()", async () => {
  const result = await $`echo 1 && echo 2`.lines();
  assertEquals(result, ["1", "2"]);
});
