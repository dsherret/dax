# dax

[![deno doc](https://doc.deno.land/badge.svg)](https://doc.deno.land/https/deno.land/x/dax/mod.ts)
[![NPM Version](https://img.shields.io/npm/v/dax-sh.svg?style=flat)](http://www.npmjs.com/package/dax-sh)

<img src="src/assets/logo.svg" height="150px" alt="dax logo">

Cross-platform shell tools for Deno and Node.js inspired by [zx](https://github.com/google/zx).

## Differences with zx

1. Cross-platform shell.
   - Makes more code work on Windows.
   - Allows exporting the shell's environment to the current process.
   - Uses [deno_task_shell](https://github.com/denoland/deno_task_shell)'s parser.
   - Has common commands built-in for better Windows support.
1. Minimal globals or global configuration.
   - Only a default instance of `$`, but it's not mandatory to use this.
1. No custom CLI.
1. Good for application code in addition to use as a shell script replacement.
1. Named after my cat.

## Executing commands

```ts
#!/usr/bin/env -S deno run --allow-all
import $ from "https://deno.land/x/dax/mod.ts";

// run a command
await $`echo 5`; // outputs: 5

// outputting to stdout and running a sub process
await $`echo 1 && deno run main.ts`;

// parallel
await Promise.all([
  $`sleep 1 ; echo 1`,
  $`sleep 2 ; echo 2`,
  $`sleep 3 ; echo 3`,
]);
```

Note: Above instructions are for Deno. For Node.js, install via `npm install --save-dev dax-sh` then import via `import $ from "dax-sh";`.

### Getting output

Get the stdout of a command (makes stdout "quiet"):

```ts
const result = await $`echo 1`.text();
console.log(result); // 1
```

Get the result of stdout as json (makes stdout "quiet"):

```ts
const result = await $`echo '{ "prop": 5 }'`.json();
console.log(result.prop); // 5
```

Get the result of stdout as bytes (makes stdout "quiet"):

```ts
const bytes = await $`gzip < file.txt`.bytes();
console.log(bytes);
```

Get the result of stdout as a list of lines (makes stdout "quiet"):

```ts
const result = await $`echo 1 && echo 2`.lines();
console.log(result); // ["1", "2"]
```

Working with a lower level result that provides more details:

```ts
const result = await $`deno eval 'console.log(1); console.error(2);'`
  .stdout("piped")
  .stderr("piped");
console.log(result.code); // 0
console.log(result.stdoutBytes); // Uint8Array(2) [ 49, 10 ]
console.log(result.stdout); // 1\n
console.log(result.stderr); // 2\n
const output = await $`echo '{ "test": 5 }'`.stdout("piped");
console.log(output.stdoutJson);
```

Getting the combined output:

```ts
const result = await $`deno eval 'console.log(1); console.error(2); console.log(3);'`
  .captureCombined();

console.log(result.combined); // 1\n2\n3\n
```

### Piping

Piping stdout or stderr to a `Deno.WriterSync`:

```ts
await $`echo 1`.stdout(Deno.stderr);
await $`deno eval 'console.error(2);`.stderr(Deno.stdout);
```

Piping to a `WritableStream`:

```ts
await $`echo 1`.stdout(Deno.stderr.writable, { preventClose: true });
// or with a redirect
await $`echo 1 > ${someWritableStream}`;
```

To a file path:

```ts
await $`echo 1`.stdout($.path("data.txt"));
// or
await $`echo 1 > data.txt`;
// or
await $`echo 1 > ${$.path("data.txt")}`;
```

To a file:

```ts
using file = $.path("data.txt").openSync({ write: true, create: true });
await $`echo 1`.stdout(file);
// or
await $`echo 1 > ${file}`;
```

From one command to another:

```ts
const output = await $`echo foo && echo bar`
  .pipe($`grep foo`)
  .text();

// or using a pipe sequence
const output = await $`(echo foo && echo bar) | grep foo`
  .text();
```

### Providing arguments to a command

Use an expression in a template literal to provide a single argument to a command:

```ts
const dirName = "some_dir";
await $`mkdir ${dirName}`; // executes as: mkdir some_dir
```

Arguments are escaped so strings with spaces get escaped and remain as a single argument:

```ts
const dirName = "Dir with spaces";
await $`mkdir ${dirName}`; // executes as: mkdir 'Dir with spaces'
```

Alternatively, provide an array for multiple arguments:

```ts
const dirNames = ["some_dir", "other dir"];
await $`mkdir ${dirNames}`; // executes as: mkdir some_dir 'other dir'
```

If you do not want to escape arguments in a template literal, you can opt out completely, by using `$.raw`:

```ts
const args = "arg1   arg2   arg3";
await $.raw`echo ${args}`; // executes as: echo arg1   arg2   arg3
```

Providing stdout of one command to another is possible as follows:

```ts
// Note: This will read trim the last newline of the other command's stdout
const result = await $`echo 1`.stdout("piped"); // need to set stdout as piped for this to work
const finalText = await $`echo ${result}`.text();
console.log(finalText); // 1
```

...though it's probably more straightforward to just collect the output text of a command and provide that:

```ts
const result = await $`echo 1`.text();
const finalText = await $`echo ${result}`.text();
console.log(finalText); // 1
```

#### JavaScript objects to redirects

You can provide JavaScript objects to shell output redirects:

```ts
const buffer = new Uint8Array(2);
await $`echo 1 && (echo 2 > ${buffer}) && echo 3`; // 1\n3\n
console.log(buffer); // Uint8Array(2) [ 50, 10 ] (2\n)
```

Supported objects: `Uint8Array`, `Path`, `WritableStream`, any function that returns a `WritableStream`, any object that implements `[$.symbols.writable](): WritableStream`

Or input redirects:

```ts
// strings
const data = "my data in a string";
const bytes = await $`gzip < ${data}`;

// paths
const path = $.path("file.txt");
const bytes = await $`gzip < ${path}`;

// requests (this example does not make the request until after 5 seconds)
const request = $.request("https://plugins.dprint.dev/info.json")
  .showProgress(); // show a progress bar while downloading
const bytes = await $`sleep 5 && gzip < ${request}`.bytes();
```

Supported objects: `string`, `Uint8Array`, `Path`, `RequestBuilder`, `ReadableStream`, any function that returns a `ReadableStream`, any object that implements `[$.symbols.readable](): ReadableStream`

### Providing stdin

```ts
await $`command`.stdin("inherit"); // default
await $`command`.stdin("null");
await $`command`.stdin(new Uint8Array[1, 2, 3, 4]());
await $`command`.stdin(someReaderOrReadableStream);
await $`command`.stdin($.path("data.json"));
await $`command`.stdin($.request("https://plugins.dprint.dev/info.json"));
await $`command`.stdinText("some value");
```

Or using a redirect:

```ts
await $`command < ${$.path("data.json")}`;
```

### Streaming API

Awaiting a command will get the `CommandResult`, but calling `.spawn()` on a command without `await` will return a `CommandChild`. This has some methods on it to get web streams of stdout and stderr of the executing command if the corresponding pipe is set to `"piped"`. These can then be sent wherever you'd like, such as to the body of a `$.request` or another command's stdin.

For example, the following will output 1, wait 2 seconds, then output 2 to the current process' stderr:

```ts
const child = $`echo 1 && sleep 1 && echo 2`.stdout("piped").spawn();
await $`deno eval 'await Deno.stdin.readable.pipeTo(Deno.stderr.writable);'`
  .stdin(child.stdout());
```

### Setting environment variables

Done via the `.env(...)` method:

```ts
// outputs: 1 2 3 4
await $`echo $var1 $var2 $var3 $var4`
  .env("var1", "1")
  .env("var2", "2")
  // or use object syntax
  .env({
    var3: "3",
    var4: "4",
  });
```

### Setting cwd for command

Use `.cwd("new_cwd_goes_here")`:

```ts
// outputs that it's in the someDir directory
await $`deno eval 'console.log(Deno.cwd());'`.cwd("./someDir");
```

### Silencing a command

Makes a command not output anything to stdout and stderr.

```ts
await $`echo 5`.quiet();
await $`echo 5`.quiet("stdout"); // or just stdout
await $`echo 5`.quiet("stderr"); // or just stderr
```

### Output a command before executing it

The following code:

```ts
const text = "example";
await $`echo ${text}`.printCommand();
```

Outputs the following (with the command text in blue):

```ts
> echo example
example
```

#### Enabling on a `$`

Like with any default in Dax, you can build a new `$` turning on this option so this will occur with all commands (see [Custom `$`](#custom-)). Alternatively, you can enable this globally by calling `$.setPrintCommand(true);`.

```ts
$.setPrintCommand(true);

const text = "example";
await $`echo ${text}`; // will output `> echo example` before running the command
```

### Timeout a command

This will exit with code 124 after 1 second.

```ts
// timeout a command after a specified time
await $`echo 1 && sleep 100 && echo 2`.timeout("1s");
```

### Aborting a command

Instead of awaiting the template literal, you can get a command child by calling the `.spawn()` method:

```ts
const child = $`echo 1 && sleep 100 && echo 2`.spawn();

await doSomeOtherWork();
child.kill(); // defaults to "SIGTERM"
await child; // Error: Aborted with exit code: 124
```

#### `KillSignalController`

In some cases you might want to send signals to many commands at the same time. This is possible via a `KillSignalController`.

```ts
import $, { KillSignalController } from "...";

const controller = new KillSignalController();
const signal = controller.signal;

const promise = Promise.all([
  $`sleep 1000s`.signal(signal),
  $`sleep 2000s`.signal(signal),
  $`sleep 3000s`.signal(signal),
]);

$.sleep("1s").then(() => controller.kill()); // defaults to "SIGTERM"

await promise; // throws after 1 second
```

Combining this with the `CommandBuilder` API and building your own `$` as shown later in the documentation, can be extremely useful for sending a `Deno.Signal` to all commands you've spawned.

### Exporting the environment of the shell to JavaScript

When executing commands in the shell, the environment will be contained to the shell and not exported to the current process. For example:

```ts
await $`cd src && export MY_VALUE=5`;
// will output nothing
await $`echo $MY_VALUE`;
// will both NOT output it's in the src dir
await $`echo $PWD`;
console.log(Deno.cwd());
```

You can change that by using `exportEnv()` on the command:

```ts
await $`cd src && export MY_VALUE=5`.exportEnv();
// will output "5"
await $`echo $MY_VALUE`;
// will both output it's in the src dir
await $`echo $PWD`;
console.log(Deno.cwd());
```

## Logging

Dax comes with some helper functions for logging:

```ts
// logs with potential indentation
// Note: everything is logged over stderr by default
$.log("Hello!");
// log with the first word as bold green
$.logStep("Fetching data from server...");
// or force multiple words to be green by using two arguments
$.logStep("Setting up", "local directory...");
// similar to $.logStep, but with red
$.logError("Error Some error message.");
// similar to $.logStep, but with yellow
$.logWarn("Warning Some warning message.");
// logs out text in gray
$.logLight("Some unimportant message.");
```

You may wish to indent some text when logging, use `$.logGroup` to do so:

```ts
// log indented within (handles de-indenting when an error is thrown)
await $.logGroup(async () => {
  $.log("This will be indented.");
  await $.logGroup(async () => {
    $.log("This will indented even more.");
    // do maybe async stuff here
  });
});

// or use $.logGroup with $.logGroupEnd
$.logGroup();
$.log("Indented 1");
$.logGroup("Level 2");
$.log("Indented 2");
$.logGroupEnd();
$.logGroupEnd();
```

As mentioned previously, Dax logs to stderr for everything by default. This may not be desired, so you can change the current behaviour of a `$` object by setting a logger for either "info", "warn", or "error".

```ts
// Set the loggers. For example, log everything
// on stdout instead of stderr
$.setInfoLogger(console.log);
$.setWarnLogger(console.log);
$.setErrorLogger(console.log);

// or a more advanced scenario
$.setInfoLogger((...args: any[]) => {
  console.error(...args);
  // write args to a file here...
};)
```

## Selections / Prompts

There are a few selections/prompts that can be used.

By default, all prompts will exit the process if the user cancelled their selection via ctrl+c. If you don't want this behaviour, then use the `maybe` variant functions.

### `$.prompt` / `$.maybePrompt`

Gets a string value from the user:

```ts
const name = await $.prompt("What's your name?");

// or provide an object, which has some more options
const name = await $.prompt({
  message: "What's your name?",
  default: "Dax", // prefilled value
  noClear: true, // don't clear the text on result
});

// or hybrid
const name = await $.prompt("What's your name?", {
  default: "Dax",
});

// with a character mask (for password / secret input)
const password = await $.prompt("What's your password?", {
  mask: true,
});
```

Again, you can use `$.maybePrompt("What's your name?")` to get a nullable return value for when the user presses `ctrl+c`.

### `$.confirm` / `$.maybeConfirm`

Gets the answer to a yes or no question:

```ts
const result = await $.confirm("Would you like to continue?");

// or with more options
const result = await $.confirm({
  message: "Would you like to continue?",
  default: true,
});

// or hybrid
const result = await $.confirm("Would you like to continue?", {
  default: false,
  noClear: true,
});
```

### `$.select` / `$.maybeSelect`

Gets a single value:

```ts
const index = await $.select({
  message: "What's your favourite colour?",
  options: [
    "Red",
    "Green",
    "Blue",
  ],
});
```

### `$.multiSelect` / `$.maybeMultiSelect`

Gets multiple or no values:

```ts
const indexes = await $.multiSelect({
  message: "Which of the following are days of the week?",
  options: [
    "Monday",
    {
      text: "Wednesday",
      selected: true, // defaults to false
    },
    "Blue",
  ],
});
```

## Progress indicator

You may wish to indicate that some progress is occurring.

### Indeterminate

```ts
const pb = $.progress("Updating Database");

await pb.with(async () => {
  // do some work here
});
```

The `.with(async () => { ... })` API will hide the progress bar when the action completes including hiding it when an error is thrown. If you don't want to bother with this though you can just call `pb.finish()` instead.

```ts
const pb = $.progress("Updating Database");

try {
  // do some work here
} finally {
  pb.finish();
}
```

### Determinate

Set a length to be determinate, which will display a progress bar:

```ts
const items = [/*...*/];
const pb = $.progress("Processing Items", {
  length: items.length,
});

await pb.with(async () => {
  for (const item of items) {
    await doWork(item);
    pb.increment(); // or use pb.position(val)
  }
});
```

#### Synchronous work

The progress bars are updated on an interval (via `setInterval`) to prevent rendering more than necessary. If you are doing a lot of synchronous work the progress bars won't update. Due to this, you can force a render where you think it would be appropriate by using the `.forceRender()` method:

```ts
const pb = $.progress("Processing Items", {
  length: items.length,
});

pb.with(() => {
  for (const item of items) {
    doWork(item);
    pb.increment();
    pb.forceRender();
  }
});
```

## Path API

The path API offers an immutable [`Path`](https://deno.land/x/dax/src/path.ts?s=Path) class, which is a similar concept to Rust's `PathBuf` struct.

```ts
// create a `Path`
let srcDir = $.path("src");
// get information about the path
srcDir.isDirSync(); // false
// do actions on it
await srcDir.mkdir();
srcDir.isDirSync(); // true

srcDir.isRelative(); // true
srcDir = srcDir.resolve(); // resolve the path to be absolute
srcDir.isRelative(); // false
srcDir.isAbsolute(); // true

// join to get other paths and do actions on them
const textFile = srcDir.join("subDir").join("file.txt");
textFile.writeTextSync("some text");
console.log(textFile.readTextSync()); // "some text"

const jsonFile = srcDir.join("otherDir", "file.json");
console.log(jsonFile.parentOrThrow()); // path for otherDir
jsonFile.writeJsonSync({
  someValue: 5,
});
console.log(jsonFile.readJsonSync().someValue); // 5
```

It also works to provide these paths to commands:

```ts
const srcDir = $.path("src").resolve();

await $`echo ${srcDir}`;
```

`Path`s can be created in the following ways:

```ts
const pathRelative = $.path("./relative");
const pathAbsolute = $.path("/tmp");
const pathFileUrl = $.path(new URL("file:///tmp")); // converts to /tmp
const pathStringFileUrl = $.path("file:///tmp"); // converts to /tmp
const pathImportMeta = $.path(import.meta); // the path for the current module
```

There are a lot of helper methods here, so check the [documentation on Path](https://deno.land/x/dax/src/path.ts?s=Path) for more details.

## Helper functions

Changing the current working directory of the current process:

```ts
$.cd("someDir");
console.log(Deno.cwd()); // will be in someDir directory

// or change the directory of the process to be in
// the directory of the current script
$.cd(import.meta);
```

Sleeping asynchronously for a specified amount of time:

```ts
await $.sleep(100); // ms
await $.sleep("1.5s");
await $.sleep("1m30s");
```

Getting path to an executable based on a command name:

```ts
console.log(await $.which("deno")); // outputs the path to deno executable
```

Check if a command exists:

```ts
console.log(await $.commandExists("deno"));
console.log($.commandExistsSync("deno"));
```

Attempting to do an action until it succeeds or hits the maximum number of retries:

```ts
await $.withRetries({
  count: 5,
  // you may also specify an iterator here which is useful for exponential backoff
  delay: "5s",
  action: async () => {
    await $`cargo publish`;
  },
});
```

"Dedent" or remove leading whitespace from a string:

```ts
console.log($.dedent`
    This line will appear without any indentation.
      * This list will appear with 2 spaces more than previous line.
      * As will this line.

    Empty lines (like the one above) will not affect the common indentation.
  `);
```

```
This line will appear without any indentation.
  * This list will appear with 2 spaces more than previous line.
  * As will this line.

Empty lines (like the one above) will not affect the common indentation.
```

Remove ansi escape sequences from a string:

```ts
$.stripAnsi("\u001B[4mHello World\u001B[0m");
//=> 'Hello World'
```

## Making requests

Dax ships with a slightly less verbose wrapper around `fetch` that will throw by default on non-`2xx` status codes (this is configurable per status code).

Download a file as JSON:

```ts
const data = await $.request("https://plugins.dprint.dev/info.json").json();
console.log(data.plugins);
```

Or as text:

```ts
const text = await $.request("https://example.com").text();
```

Or get the long form:

```ts
const response = await $.request("https://plugins.dprint.dev/info.json");
console.log(response.code);
console.log(await response.json());
```

Requests can be piped to commands:

```ts
const request = $.request("https://plugins.dprint.dev/info.json");
await $`deno run main.ts`.stdin(request);

// or as a redirect... this sleeps 5 seconds, then makes
// request and redirects the output to the command
await $`sleep 5 && deno run main.ts < ${request}`;
```

See the [documentation on `RequestBuilder`](https://deno.land/x/dax/src/request.ts?s=RequestBuilder) for more details. It should be as flexible as `fetch`, but uses a builder API (ex. set headers via `.header(...)`).

### Showing progress

You can have downloads show a progress bar by using the `.showProgress()` builder method:

```ts
const url = "https://dl.deno.land/release/v1.29.1/deno-x86_64-unknown-linux-gnu.zip";
const downloadPath = await $.request(url)
  .showProgress()
  .pipeToPath();
```

## Shell

The shell is cross-platform and uses the parser from [deno_task_shell](https://github.com/denoland/deno_task_shell).

Sequential lists:

```ts
// result will contain the directory in someDir
const result = await $`cd someDir ; deno eval 'console.log(Deno.cwd())'`;
```

Boolean lists:

```ts
// outputs to stdout with 1\n\2n
await $`echo 1 && echo 2`;
// outputs to stdout with 1\n
await $`echo 1 || echo 2`;
```

Pipe sequences:

```ts
await $`echo 1 | deno run main.ts`;
```

Redirects:

```ts
await $`echo 1 > output.txt`;
const gzippedBytes = await $`gzip < input.txt`.bytes();
```

Sub shells:

```ts
await $`(echo 1 && echo 2) > output.txt`;
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
await $`test=123 && deno eval 'console.log(Deno.env.get('test'))' && echo $test`;
```

Env variables (these are exported):

```ts
// the 'test' variable WILL be exported to the sub processes and
// it will be used in the final echo command
await $`export test=123 && deno eval 'console.log(Deno.env.get('test'))' && echo $test`;
```

Variable substitution:

```ts
const result = await $`echo $TEST`.env("TEST", "123").text();
console.log(result); // 123
```

### Custom cross-platform shell commands

Currently implemented (though not every option is supported):

- [`cd`](https://man7.org/linux/man-pages/man1/cd.1p.html) - Change directory command.
  - Note that shells don't export their environment by default.
- [`echo`](https://man7.org/linux/man-pages/man1/echo.1.html) - Echo command.
- [`exit`](https://man7.org/linux/man-pages/man1/exit.1p.html) - Exit command.
- [`cp`](https://man7.org/linux/man-pages/man1/cp.1.html) - Copies files.
- [`mv`](https://man7.org/linux/man-pages/man1/mv.1.html) - Moves files.
- [`rm`](https://man7.org/linux/man-pages/man1/rm.1.html) - Remove files or directories command.
- [`mkdir`](https://man7.org/linux/man-pages/man1/mkdir.1.html) - Makes
  directories.
  - Ex. `mkdir -p DIRECTORY...` - Commonly used to make a directory and all its
    parents with no error if it exists.
- [`pwd`](https://man7.org/linux/man-pages/man1/pwd.1.html) - Prints the current/working directory.
- [`sleep`](https://man7.org/linux/man-pages/man1/sleep.1.html) - Sleep command.
- [`test`](https://man7.org/linux/man-pages/man1/test.1.html) - Test command.
- [`touch`](https://man7.org/linux/man-pages/man1/touch.1.html) - Creates a file (note: flags have not been implemented yet).
- [`unset`](https://man7.org/linux/man-pages/man1/unset.1p.html) - Unsets an environment variable.
- [`cat`](https://man7.org/linux/man-pages/man1/cat.1.html) - Concatenate files and print on the standard output
- [`printenv`](https://man7.org/linux/man-pages/man1/printenv.1.html) - Print all or part of environment
- More to come. Will try to get a similar list as https://deno.land/manual/tools/task_runner#built-in-commands

You can also register your own commands with the shell parser (see below).

Note that these cross-platform commands can be bypassed by running them through `sh`: `sh -c <command>` (ex. `sh -c cp source destination`). Obviously doing this won't work on Windows though.

### Cross-platform shebang support

Users on unix-based platforms often write a script like so:

```ts
#!/usr/bin/env -S deno run
console.log("Hello there!");
```

...which can be executed on the command line by running `./file.ts`. This doesn't work on the command line in Windows, but it does on all platforms in dax:

```ts
await $`./file.ts`;
```

## Builder APIs

The builder APIs are what the library uses internally and they're useful for scenarios where you want to re-use some setup state. They're immutable so every function call returns a new object (which is the same thing that happens with the objects returned from `$` and `$.request`).

### `CommandBuilder`

`CommandBuilder` can be used for building up commands similar to what the tagged template `$` does:

```ts
import { CommandBuilder } from "https://deno.land/x/dax/mod.ts";

const commandBuilder = new CommandBuilder()
  .cwd("./subDir")
  .stdout("inheritPiped") // output to stdout and pipe to a buffer
  .noThrow();

const otherBuilder = commandBuilder
  .stderr("null");

const result = await commandBuilder
  // won't have a null stderr
  .command("deno run my_script.ts")
  .spawn();

const result2 = await otherBuilder
  // will have a null stderr
  .command("deno run my_script.ts")
  .spawn();
```

You can also register your own custom commands using the `registerCommand` or `registerCommands` methods:

```ts
const commandBuilder = new CommandBuilder()
  .registerCommand(
    "true",
    () => Promise.resolve({ code: 0 }),
  );

const result = await commandBuilder
  // now includes the 'true' command
  .command("true && echo yay")
  .spawn();
```

### `RequestBuilder`

`RequestBuilder` can be used for building up requests similar to `$.request`:

```ts
import { RequestBuilder } from "https://deno.land/x/dax/mod.ts";

const requestBuilder = new RequestBuilder()
  .header("SOME_VALUE", "some value to send in a header");

const result = await requestBuilder
  .url("https://example.com")
  .timeout("10s")
  .text();
```

### Custom `$`

You may wish to create your own `$` function that has a certain setup context (for example, custom commands or functions on `$`, a defined environment variable or cwd). You may do this by using the exported `build$` with `CommandBuilder` and/or `RequestBuilder`, which is essentially what the main default exported `$` uses internally to build itself. In addition, you may also add your own functions to `$`:

```ts
import { build$, CommandBuilder, RequestBuilder } from "https://deno.land/x/dax/mod.ts";

// creates a $ object with the provided starting environment
const $ = build$({
  commandBuilder: new CommandBuilder()
    .cwd("./subDir")
    .env("HTTPS_PROXY", "some_value"),
  requestBuilder: new RequestBuilder()
    .header("SOME_NAME", "some value"),
  extras: {
    add(a: number, b: number) {
      return a + b;
    },
  },
});

// this command will use the env described above, but the main
// process won't have its environment changed
await $`deno run my_script.ts`;

console.log(await $.request("https://plugins.dprint.dev/info.json").json());

// use your custom function
console.log($.add(1, 2));
```

This may be useful also if you want to change the default configuration. Another example:

```ts
const commandBuilder = new CommandBuilder()
  .exportEnv()
  .noThrow();

const $ = build$({ commandBuilder });

// since exportEnv() was set, this will now actually change
// the directory of the executing process
await $`cd test && export MY_VALUE=5`;
// will output "5"
await $`echo $MY_VALUE`;
// will output it's in the test dir
await $`echo $PWD`;
// won't throw even though this command fails (because of `.noThrow()`)
await $`deno eval 'Deno.exit(1);'`;
```

#### Building `$` from another `$`

You can build a `$` from another `$` by calling `$.build$({ /* options go here */ })`.

This might be useful in scenarios where you want to use a `$` with a custom logger.

```ts
const local$ = $.build$();
local$.setInfoLogger((...args: any[]) => {
  // a more real example might be logging to a file
  console.log("Logging...");
  console.log(...args);
});
local$.log("Hello!");
```

Outputs:

```
Logging...
Hello!
```
