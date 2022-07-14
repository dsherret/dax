# dax

[![deno doc](https://doc.deno.land/badge.svg)](https://doc.deno.land/https/deno.land/x/dax/mod.ts)

**Note:** This is very early stages. Just started working on it.

Cross platform shell tools for Deno inspired by [zx](https://github.com/google/zx).

Differences:

1. No globals or custom CLI command to execute—import into a script then use `deno run -A your_script.ts`.
1. Cross platform shell to help the code work on Windows.
   - Uses [deno_task_shell](https://github.com/denoland/deno_task_shell)'s parser.
   - Allows exporting the shell's environment to the current process (see `.exportEnv()` below)
1. Named after my cat.

## Example

```ts
import $ from "https://deno.land/x/dax@VERSION_GOES_HERE/mod.ts";

const result = await $`echo 5`;
console.log(result.stdout); // 5\n

// providing result of command to other command
// Note: This will read the command's stdout and trim the last newline
const result = await $`echo 1`;
const result2 = await $`echo ${result}`;
console.log(result2.stdout); // 1\n

// runs the script showing stdout (stderr is inherited by default)
await $`deno run my_script.ts`.stdout("inherit");

// capture stderr
const result = await $`deno eval 'console.error(5);'`.stderr("piped");
console.log(result.stderr.trim()); // 5, would throw if not piped

// get output as json
const output = await $`deno eval "console.log(JSON.stringify({ test: 5 }));"`;
console.log(output.stdoutJson);

// setting env variables (outputs: 1 2 3 4)
await $`echo $var1 $var2 $var3 $var4`
  .env("var1", "1")
  .env("var2", "2")
  // or use object syntax
  .env({
    var3: "3",
    var4: "4",
  })
  .stdout("inherit");

// setting cwd for command
await $`deno eval 'console.log(Deno.cwd());'`.cwd("./someDir");

// echo (console.log alias)
$.echo("Hello!");

// change directory
$.cd("newDir");

// sleep
await $.sleep(1000);

// get path to an executable
await $.which("deno"); // path to deno executable

// attempt doing an action until it succeeds
await $.withRetries({
  count: 5,
  delay: 5_000,
  action: async () => {
    await $`cargo publish`;
  },
});

// re-export of deno_std's path
$.path.basename("./deno/std/path/mod.ts"); // mod.ts

// re-export of deno_std's fs
for await (const file of $.fs.expandGlob("**/*.ts")) {
  console.log(file);
}

// export the environment of a command to the executing process
await $`cd src && export MY_VALUE=5`.exportEnv();
// will output "5"
await $`echo $MY_VALUE`.stdout("inherit");
// will output it's in the src dir
await $`echo $PWD`.stdout("inherit");
// this will also output it's in the src dir
console.log(Deno.cwd());
```

## Shell

The shell is cross platform and uses the parser from [deno_task_shell](https://github.com/denoland/deno_task_shell).

Sequential lists:

```ts
// result will contain the directory in someDir
const result = await $`cd someDir ; deno eval 'console.log(Deno.cwd())'`;
```

Boolean lists:

```ts
// returns stdout with 1\n\2n
await $`echo 1 && echo 2`;
// returns stdout with 1\n
await $`echo 1 || echo 2`;
```

Setting env var for command in the shell (generally you can just use `.env(...)` though):

```ts
// result will contain the directory in someDir
const result = await $`test=123 deno eval 'console.log(Deno.env.get('test'))'`;
console.log(result.stdout); // 123
```

Shell variables (these aren't exported):

```ts
// the 'test' variable WON'T be exported to the sub processes, so
// that will print a blank line, but it will be used in the final echo command
const result =
  await $`test=123 && deno eval 'console.log(Deno.env.get('test'))' && echo $test`;
```

Env variables (these are exported):

```ts
// the 'test' variable WILL be exported to the sub processes and
// it will be used in the final echo command
const result =
  await $`export test=123 && deno eval 'console.log(Deno.env.get('test'))' && echo $test`;
```

Variable substitution:

```ts
const result = await $`echo $TEST`.env("TEST", "123");
console.log(result.stdout); // 123
```

todo...

### Custom Cross Platform Shell Commands

Currently implemented (though not every option is supported):

- [`cd`](https://man7.org/linux/man-pages/man1/cd.1p.html) - Change directory command.
  - Note that shells don't export their environment by default.
- [`echo`](https://man7.org/linux/man-pages/man1/echo.1.html) - Echo command.

## Command Builder

You may wish to create your own `$` function that has a certain setup context (for example, a defined environment variable or cwd). You may do this by using a `CommandBuilder`, which is what the main default exported `$` function uses internally:

```ts
import { CommandBuilder } from "https://deno.land/x/dax@{VERSION_GOES_HERE}/mod.ts";

const builder = new CommandBuilder()
  .cwd("./subDir")
  .env("HTTPS_PROXY", "some_value");

// creates a $ object with the starting environment as shown above
const $ = builder.build$();

// this command will use the env described above, but the main
// process won't have its environment changed
await $`deno run my_script.ts`;
```

This may be useful also if you want to change the default configuration, for example:

```ts
const builder = new CommandBuilder()
  .exportEnv()
  .stdout("inherit");

const $ = builder.build$();

// since exportEnv() was set, this will now actually change
// the directory of the executing process
await $`cd test && export MY_VALUE=5`;
// will output "5"
await $`echo $MY_VALUE`;
// will output it's in the test dir
await $`echo $PWD`;
// this will now output to stdout instead of piping by default
await $`echo 'hello'`;
```
