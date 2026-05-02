---
layout: layout.vto
---

<section class="intro hero" id="overview">
  <div>
    <h4 class="eyebrow">{{ version }}</h4>
    <h1>dax — shell scripting<br/>that runs the same everywhere.</h1>
    <p class="lede">
      Cross-platform shell tools for Deno and Node.js inspired by <a href="https://github.com/google/zx">zx</a> — a friendlier <code>$</code> for spawning processes, with a built-in shell parser, built-in commands, prompts, requests, and a <code>Path</code> API.
    </p>
    <div class="badges">
      <a class="badge jsr" href="https://jsr.io/@david/dax"><span class="b-l">JSR</span><span class="b-r">@david/dax</span></a>
      <a class="badge npm" href="https://www.npmjs.com/package/dax"><span class="b-l">npm</span><span class="b-r">dax</span></a>
    </div>
    <div class="cta">
      <a class="btn btn-primary" href="#install">Get started
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
      </a>
      <a class="btn btn-secondary" href="#shell">Shell reference</a>
      <a class="btn btn-ghost" href="https://github.com/dsherret/dax" target="_blank" rel="noopener">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-2.13c-3.2.7-3.87-1.36-3.87-1.36-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.76 2.69 1.25 3.34.96.1-.74.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.05 0 0 .96-.31 3.15 1.18.91-.25 1.89-.38 2.86-.39.97.01 1.95.13 2.86.39 2.18-1.49 3.14-1.18 3.14-1.18.62 1.59.23 2.76.11 3.05.74.81 1.18 1.84 1.18 3.1 0 4.43-2.7 5.41-5.27 5.69.41.36.78 1.06.78 2.13v3.16c0 .31.21.68.8.56 4.56-1.52 7.85-5.83 7.85-10.91C23.5 5.65 18.35.5 12 .5z"/></svg>
        Star on GitHub
      </a>
    </div>
  </div>
  <div class="hero-art">
    <img src="/logo.svg" alt="dax logo — a cat with an arrow" />
  </div>
</section>

## Highlights <a class="anchor" href="#highlights">#</a> {#highlights}

<div class="feature-grid">
  <div class="feat feat-hero">
    <span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg></span>
    <h3>Cross-platform shell</h3>
    <p>Same shell on macOS, Linux, and Windows. Common commands (<code>cp</code>, <code>mv</code>, <code>rm</code>, <code>mkdir</code>, …) are built in for better Windows support, and the shell's env can be exported back to the host process.</p>
  </div>
  <div class="feat">
    <span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z"/><path d="M9 12l2 2 4-4"/></svg></span>
    <h3>Safe by default</h3>
    <p>Template literal interpolations are escaped automatically — <code>$`mkdir ${dir}`</code> works whether <code>dir</code> is <code>"foo"</code> or <code>"Dir with spaces &amp; quotes"</code>. No manual quoting, no shell-injection bugs.</p>
  </div>
  <div class="feat">
    <span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 12h11"/><path d="M10 8l4 4-4 4"/><circle cx="19" cy="12" r="1.5"/></svg></span>
    <h3>Structured output</h3>
    <p>Coerce stdout into the shape you need with chained methods: <code>.text()</code>, <code>.json()</code>, <code>.lines()</code>, <code>.bytes()</code>, or stream line-by-line with <code>.linesIter()</code>.</p>
  </div>
  <div class="feat">
    <span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg></span>
    <h3>Batteries included</h3>
    <p>Prompts (<code>$.confirm</code>, <code>$.select</code>), progress bars (<code>$.progress</code>), HTTP requests (<code>$.request</code>), and an immutable <code>Path</code> API — all in one library.</p>
  </div>
  <div class="feat">
    <span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.24 12.24a6 6 0 00-8.49-8.49L5 10.5V19h8.5z"/><path d="M16 8L2 22"/><path d="M17.5 15H9"/></svg></span>
    <h3>Portable</h3>
    <p>Pure TypeScript and WebAssembly — no native dependencies, no compile step, no postinstall scripts. The code runs the same across all Node-compatible runtimes — no vendor lock-in.</p>
  </div>
</div>

## Install <a class="anchor" href="#install">#</a> {#install}

<div class="install-card">
  <div class="tabs" role="tablist">
    <button class="tab active" data-runtime="npm" role="tab"><span class="dot"></span>npm</button>
    <button class="tab" data-runtime="jsr" role="tab"><span class="dot"></span>JSR</button>
  </div>
  <div class="install-body">
<pre data-pane="npm"><code class="language-bash">npm install dax</code></pre>
<pre data-pane="jsr" hidden><code class="language-bash"># deno
deno add dax@jsr:@david/dax
# other
npx jsr add dax@jsr:@david/dax</code></pre>
  </div>
</div>

## Executing commands <a class="anchor" href="#executing">#</a> {#executing}

```ts
import $ from "dax";

// run a command
await $`echo 5`; // outputs: 5

// output to stdout and run a sub process
await $`echo 1 && deno run main.ts`;

// parallel
await Promise.all([
  $`sleep 1 ; echo 1`,
  $`sleep 2 ; echo 2`,
  $`sleep 3 ; echo 3`,
]);
```

## Providing arguments to a command <a class="anchor" href="#arguments">#</a> {#arguments}

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

If you do not want to escape an argument in a template literal, you can opt out by using `$.rawArg` starting in 0.43.0:

```ts
const args = "arg1   arg2";
await $`echo ${$.rawArg(args)} ${args}`; // executes as: echo arg1 arg2 arg1   arg2
```

Alternatively, you can opt out completely by using `$.raw`:

```ts
const args = "arg1   arg2";
await $.raw`echo ${args}`; // executes as: echo arg1 arg2

// or escape a specific argument while using $.raw
await $.raw`echo ${$.escapeArg(args)} ${args}`; // executes as: echo "arg1  arg2" arg1 arg2
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

### JavaScript objects to redirects

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

## Providing stdin <a class="anchor" href="#stdin">#</a> {#stdin}

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

## Getting output <a class="anchor" href="#getting-output">#</a> {#getting-output}

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

Stream the output line-by-line without buffering the whole thing into memory (makes the chosen stream "quiet"):

```ts
for await (const line of $`cat big.txt`.linesIter()) {
  console.log(line);
}

// also works for stderr
for await (const line of $`some-command`.linesIter("stderr")) {
  console.log(line);
}
```

Breaking out of the loop early kills the child process. Lines split at `\n` or `\r\n` and the terminators are not included.

Get stderr's text:

```ts
const result = await $`deno eval "console.error(1)"`.text("stderr");
console.log(result); // 1
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
const text = await $`deno eval 'console.log(1); console.error(2); console.log(3);'`
  .text("combined");

console.log(text); // 1\n2\n3\n
```

## Streaming API <a class="anchor" href="#streaming">#</a> {#streaming}

Awaiting a command will get the `CommandResult`, but calling `.spawn()` on a command without `await` will return a `CommandChild`. This has some methods on it to get web streams of stdout and stderr of the executing command if the corresponding pipe is set to `"piped"`. These can then be sent wherever you'd like, such as to the body of a `$.request` or another command's stdin.

For example, the following will output 1, wait 2 seconds, then output 2 to the current process' stderr:

```ts
const child = $`echo 1 && sleep 1 && echo 2`.stdout("piped").spawn();
await $`deno eval 'await Deno.stdin.readable.pipeTo(Deno.stderr.writable);'`
  .stdin(child.stdout());
```

## Piping <a class="anchor" href="#piping">#</a> {#piping}

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

## Silencing a command <a class="anchor" href="#silencing">#</a> {#silencing}

Makes a command not output anything to stdout and stderr.

```ts
await $`echo 5`.quiet();
await $`echo 5`.quiet("stdout"); // only silence stdout
await $`echo 5`.quiet("stderr"); // only silence stderr
```

## Output a command before executing it <a class="anchor" href="#print-command">#</a> {#print-command}

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

### Enabling on a `$`

Like with any default in Dax, you can build a new `$` turning on this option so this will occur with all commands (see [Custom `$`](#custom-dollar)). Alternatively, you can enable this globally by calling `$.setPrintCommand(true);`.

```ts
$.setPrintCommand(true);

const text = "example";
await $`echo ${text}`; // will output `> echo example` before running the command
```

## Tail display (Docker-style partial scrolling) <a class="anchor" href="#tail-display">#</a> {#tail-display}

`.tailDisplay()` pins the command's output to a fixed-height region at the bottom of the terminal — only the most recent lines are shown live, and on completion they're cleared from the live region (the full output stays in scrollback above for failed commands).

```ts
// keep the last 5 lines of `./build.sh` pinned while it runs
await $`./build.sh`.tailDisplay();

// configure visible row count and header
await $`./build.sh`.tailDisplay({ maxLines: 2, header: false });

// percentage sizing — re-fits if the terminal is resized mid-run
await $`./build.sh`.tailDisplay({ maxLines: "50%" });

// custom header rendered verbatim (you supply any styling)
await $`./build.sh`.tailDisplay({
  maxLines: 10,
  header: ({ command }) => `building ${command}…`,
});
```

`maxLines` accepts a literal number, a `"N%"` string resolved against the terminal height at draw time, or a `(ctx) => number` callback. Defaults to 5.

`header` accepts:

- `undefined` (default) — `Running <command>` while running, `Ran <command>` promoted to scrollback when `.printCommand()` is set.
- `false` — no header.
- A `string` or `({ command, size }) => string` callback — rendered verbatim.

Concurrent tailing commands compose into a single shared scrolling region, so multiple builds can run in parallel without spilling over each other:

```ts
await Promise.all([
  $`./build.sh frontend`.tailDisplay({ maxLines: 4 }),
  $`./build.sh backend`.tailDisplay({ maxLines: 4 }),
]);
```

### Enabling on a `$`

Like `printCommand`, you can build a new `$` turning this on (see [Custom `$`](#custom-dollar)) or enable it globally on the default `$`:

```ts
$.setTailDisplay(true);
// or with options
$.setTailDisplay({ maxLines: 10 });
```

## Exit codes <a class="anchor" href="#exit-codes">#</a> {#exit-codes}

By default, commands will throw an error on non-zero exit code:

```ts
await $`exit 123`;
// Uncaught Error: Exited with code: 123
//    at CommandChild.pipedStdoutBuffer (...)
```

If you want to disable this behaviour, run a command with `.noThrow()`:

```ts
const result = await $`exit 123`.noThrow();
console.log(result.code); // 123
// or only for certain exit codes
await $`exit 123`.noThrow(123);
```

Or handle the error case within the shell:

```ts
await $`failing_command || echo 'Errored!'`;
```

Note: if you want it to not throw by default, you can build a custom `$` (see below).

### Exit code helper

If you just want to get the exit code, you can use the `.code()` helper:

```ts
const code = await $`git diff --quiet`.code();
```

## Capturing output for failure messages <a class="anchor" href="#error-tail">#</a> {#error-tail}

`.errorTail()` silently retains the trailing bytes of stdout and/or stderr while a command runs and appends them to the thrown `Error.message` if the command exits with a non-zero code. It targets streams the user _can't_ see — piped to another command, redirected to a file, sent to a `WritableStream`, or discarded with `"null"` — so when the command fails you still get a glimpse of what was written. Streams routed to the terminal (`"inherit"` / `"inheritPiped"`) are skipped, since the bytes already reached the scrollback.

The most common case is `.quiet()`: stdout/stderr are suppressed, so without `.errorTail()` you have no idea what the command was doing when it failed.

```ts
// surfaces the trailing stdout/stderr bytes in the error if the command fails
await $`./build.sh`.errorTail().quiet();

// raise the per-stream cap (default: 8 KiB)
await $`./build.sh`.errorTail({ maxBytes: 16 * 1024 }).quiet();

// only capture stderr
await $`./build.sh > out.log`.errorTail({ stdout: false }).quiet();

// merge stdout and stderr into one interleaved buffer so the error
// message preserves the order the bytes were written
await $`./build.sh > out.log 2> err.log`.errorTail({ combined: true }).quiet();
```

`.errorTail()` has no effect when the command succeeds (the buffer is discarded) or when `.noThrow()` swallows the failure.

### Enabling on a `$`

You can build a new `$` turning this on (see [Custom `$`](#custom-dollar)) or enable it globally on the default `$`:

```ts
$.setErrorTail(true);
// or with options
$.setErrorTail({ maxBytes: 16 * 1024 });
```

## Setting environment variables <a class="anchor" href="#env">#</a> {#env}

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

## Setting cwd for command <a class="anchor" href="#cwd">#</a> {#cwd}

Use `.cwd("new_cwd_goes_here")`:

```ts
// outputs that it's in the someDir directory
await $`deno eval 'console.log(Deno.cwd());'`.cwd("./someDir");
```

## Exporting the environment of the shell to JavaScript <a class="anchor" href="#export-env">#</a> {#export-env}

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

## Timeout a command <a class="anchor" href="#timeout">#</a> {#timeout}

This will exit with code 124 after 1 second.

```ts
// timeout a command after a specified time
await $`echo 1 && sleep 100 && echo 2`.timeout("1s");
```

## Aborting a command <a class="anchor" href="#aborting">#</a> {#aborting}

Instead of awaiting the template literal, you can get a command child by calling the `.spawn()` method:

```ts
const child = $`echo 1 && sleep 100 && echo 2`.spawn();

await doSomeOtherWork();
child.kill(); // defaults to "SIGTERM"
await child; // Error: Aborted with exit code: 124
```

### `KillController`

In some cases you might want to send signals to many commands at the same time. This is possible via a `KillController`.

```ts
import $, { KillController } from "...";

const controller = new KillController();
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

## Modifying a command before it is spawned <a class="anchor" href="#before-command">#</a> {#before-command}

Use `.beforeCommand(callback)` to register a hook that runs immediately before each command is spawned. The callback receives the current builder and may return a (possibly modified) builder — useful when an env var depends on an asynchronous operation, such as fetching a token:

```ts
await $`./build.sh`
  .beforeCommand(async (builder) => {
    return builder.env("AUTH_TOKEN", await getAccessToken());
  });
```

Multiple `.beforeCommand(...)` calls compose: each callback runs in the order it was registered, with the builder produced by the previous one.

Async hooks only run on the await / `.then()` path. Calling `.spawn()` on a builder with `.beforeCommand` hooks throws — for the streaming case, use the synchronous variant:

```ts
const child = $`./build.sh`
  .beforeCommandSync((builder) => builder.env("BUILD_ID", crypto.randomUUID()))
  .spawn();
```

`.beforeCommandSync(callback)` accepts a callback that returns synchronously (`CommandBuilder` or nothing). Sync hooks always run before async hooks during a single resolution pass.

## Shell <a class="anchor" href="#shell">#</a> {#shell}

The shell is cross-platform and uses the parser from [deno_task_shell](https://github.com/denoland/deno_task_shell).

Sequential lists:

```ts
// result will contain the directory in someDir
const result = await $`cd someDir ; deno eval 'console.log(Deno.cwd())'`;
```

Multi-line commands — write each command on its own line:

```ts
await $`
  echo one
  echo two
  echo three
`;
```

In multi-line input, `errexit` (`set -e`) is on by default — the first failing line stops the rest. Single-line input (`a; b`) will continue-on-failure. You can opt in or out explicitly with `set -e` / `set +e`:

```ts
// keep running even if an earlier line fails
await $`
  set +e
  (exit 3)
  echo still-ran
`;
```

Trailing `&&`, `||`, `|`, and backslash-newline continue onto the next line as you'd expect.

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

## Custom cross-platform shell commands <a class="anchor" href="#builtins">#</a> {#builtins}

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
- [`set`](https://man7.org/linux/man-pages/man1/set.1p.html) - Only supports `pipefail`
- [`shopt`](https://www.gnu.org/software/bash/manual/html_node/The-Shopt-Builtin.html) - Only supports `nullglob`, `failglob`, `globstar` (defaults to `globstar`)
- [`sleep`](https://man7.org/linux/man-pages/man1/sleep.1.html) - Sleep command.
- [`test`](https://man7.org/linux/man-pages/man1/test.1.html) - Test command.
- [`touch`](https://man7.org/linux/man-pages/man1/touch.1.html) - Creates a file (note: flags have not been implemented yet).
- [`unset`](https://man7.org/linux/man-pages/man1/unset.1p.html) - Unsets an environment variable.
- [`cat`](https://man7.org/linux/man-pages/man1/cat.1.html) - Concatenate files and print on the standard output
- [`printenv`](https://man7.org/linux/man-pages/man1/printenv.1.html) - Print all or part of environment
- `which` - Resolves the path to an executable (`-a` flag is not supported at this time)
- [`true`](https://man7.org/linux/man-pages/man1/true.1.html) - True command.
- [`false`](https://man7.org/linux/man-pages/man1/false.1.html) - False command.

You can also register your own commands with the shell parser (see below).

Note that these cross-platform commands can be bypassed by running them through `sh`: `sh -c <command>` (ex. `sh -c cp source destination`). Obviously doing this won't work on Windows though.

## Shell Options <a class="anchor" href="#shell-options">#</a> {#shell-options}

- `errexit` (`set -e`/`+e` or `set -o`/`+o errexit`) - When enabled, a sequential list aborts at the first non-zero command. Default: **on for multi-line input, off for single-line input**
- `pipefail` (`set -o`/`+o`) - When enabled, a pipeline's exit code is the rightmost non-zero exit code. Default: **off**
- `nullglob` (`shopt -s`/`-u`) - When enabled, a glob pattern matching nothing expands to nothing. Default: **off**
- `failglob` (`shopt -s`/`-u`) - When enabled, a glob pattern matching nothing causes an error. Default: **off**
- `globstar` (`shopt -s`/`-u`) - When enabled, `**` matches recursively across directories. Default: **on**
- `questionGlob` (builder only) - When enabled, `?` matches any single character in glob patterns. When disabled, `?` is treated literally. Default: **off**

These can be configured via builder methods or when building a custom `$`:

```ts
const $ = build$({
  commandBuilder: (builder) =>
    builder
      .pipefail()
      .nullglob()
      .failglob()
      .globstar(false)
      .questionGlob(),
});
```

## Cross-platform shebang support <a class="anchor" href="#shebang">#</a> {#shebang}

Users on unix-based platforms often write a script like so:

```ts
#!/usr/bin/env -S deno run
console.log("Hello there!");
```

...which can be executed on the command line by running `./file.ts`. This doesn't work on the command line in Windows, but it does on all platforms in dax:

```ts
await $`./file.ts`;
```

## Logging <a class="anchor" href="#logging">#</a> {#logging}

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

## Making requests <a class="anchor" href="#requests">#</a> {#requests}

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

See the [documentation on `RequestBuilder`](https://jsr.io/@david/dax/doc/~/RequestBuilder) for more details. It should be as flexible as `fetch`, but uses a builder API (ex. set headers via `.header(...)`).

### Showing progress

You can have downloads show a progress bar by using the `.showProgress()` builder method:

```ts
const url = "https://dl.deno.land/release/v1.29.1/deno-x86_64-unknown-linux-gnu.zip";
const downloadPath = await $.request(url)
  .showProgress()
  .pipeToPath();
```

### Custom progress reporting

If you'd rather render your own progress UI (or report progress somewhere other than the terminal), use `.onProgress(callback)` instead. The callback fires once per chunk read from the response body with the cumulative bytes received and the total expected size:

```ts
await $.request(url)
  .onProgress(({ loaded, total }) => {
    if (total != null) {
      console.log(`${(loaded / total * 100).toFixed(1)}%`);
    } else {
      console.log(`${loaded} bytes`);
    }
  })
  .pipeToPath();
```

`total` is taken from the `content-length` response header and will be `undefined` if the server doesn't provide one. Multiple callbacks may be registered by calling `.onProgress` repeatedly — each is invoked in the order it was added. `.onProgress` is independent of `.showProgress`, so the two can be combined or used on their own.

### Modifying a request before it is sent

Use `.beforeRequest(callback)` to register a hook that runs immediately before the request is sent. The callback receives the current builder and may return a (possibly modified) builder — useful when a header value depends on an asynchronous operation, such as fetching an auth token:

```ts
$.request(`${baseUrl}${path}`)
  .header("Content-Type", "application/json")
  .beforeRequest(async (builder) => {
    return builder.header("Authorization", `Bearer ${await getAccessToken()}`);
  });
```

Multiple `.beforeRequest(...)` calls compose: each callback runs in the order it was registered, with the builder produced by the previous one.

## Selections / Prompts <a class="anchor" href="#prompts">#</a> {#prompts}

There are a few selections/prompts that can be used.

By default, all prompts will exit the process if the user cancelled their selection via ctrl+c. If you don't want this behaviour, then use the `maybe` variant functions.

### `$.alert`

Shows a message and blocks until the user acknowledges it. By default, any key press dismisses the alert:

```ts
await $.alert("Backup complete!");

// or require the user to press Enter
await $.alert("Backup complete!", {
  requireEnter: true,
});

// or provide an object
await $.alert({
  message: "Backup complete!",
  noClear: true, // don't clear the text on dismissal
});
```

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
const colours = ["Red", "Green", "Blue"];
const result = await $.select({
  message: "What's your favourite colour?",
  options: colours,
});

console.log(result.index); // e.g. 0
console.log(result.value); // e.g. "Red"
console.log(colours[result]); // also works — coerces to the index
```

### `$.multiSelect` / `$.maybeMultiSelect`

Gets multiple or no values:

```ts
const result = await $.multiSelect({
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

for (const item of result) {
  console.log(item.index, item.value);
}
```

## Progress indicator <a class="anchor" href="#progress">#</a> {#progress}

You may wish to indicate that some progress is occurring.

### Indeterminate

A spinner for work whose total isn't known up front:

<video class="demo-video" muted loop playsinline preload="none" src="/videos/01_indeterminate.mp4"></video>

```ts
const pb = $.progress("Updating Database");

await pb.with(async () => {
  // do some work here
});
```

The `.with(async () => { ... })` API will hide the progress bar when the action completes, including when an error is thrown. If you don't want to bother with this you can call `pb.finish()` directly instead:

```ts
const pb = $.progress("Updating Database");

try {
  // do some work here
} finally {
  pb.finish();
}
```

### Determinate

Set a `length` to render a filled bar with a percentage. The displayed message can be updated mid-run via `pb.message(text)` to reflect the current step (and `pb.prefix(text)` updates the green prefix the same way):

<video class="demo-video" muted loop playsinline preload="none" src="/videos/02_determinate.mp4"></video>

```ts
const files = [/*...*/];
const pb = $.progress("Type-checking", { length: files.length });

await pb.with(async () => {
  for (const file of files) {
    pb.message(file);
    await typeCheck(file);
    pb.increment(); // or use pb.position(val)
  }
});
```

### Bytes-formatted bars

For downloads or anything else measured in bytes, chain `.kind("bytes")` to format `length` and `position` as human-readable sizes (e.g. `12.34 MiB / 40.00 MiB`):

<video class="demo-video" muted loop playsinline preload="none" src="/videos/03_bytes.mp4"></video>

```ts
const pb = $.progress("Downloading data.zip", { length: totalBytes })
  .kind("bytes");

await pb.with(async () => {
  for await (const chunk of stream) {
    await write(chunk);
    pb.increment(chunk.length);
  }
});
```

> If you're downloading via `$.request`, you don't need to wire this up yourself — calling [`.showProgress()`](#requests) on the request gives you a bytes-formatted bar for free.

### Multiple bars in parallel

Any number of progress bars can be active at once. They stack in the order they were created and reflow as each one finishes — useful for parallel downloads or per-file processing:

<video class="demo-video" muted loop playsinline preload="none" src="/videos/04_parallel.mp4"></video>

```ts
await Promise.all(
  files.map(async (file) => {
    const pb = $.progress(`Downloading ${file.name}`, { length: file.size })
      .kind("bytes");
    await pb.with(() => download(file, (n) => pb.increment(n)));
  }),
);
```

### Logging alongside progress bars

`$.log`, `$.logStep`, `$.logError`, and friends are progress-aware: their output prints _above_ any active bars without tearing them. You can stream a log of completed steps while a bar continues to animate:

<video class="demo-video" muted loop playsinline preload="none" src="/videos/05_logging.mp4"></video>

```ts
const pb = $.progress("Migrating tables", { length: tables.length });

await pb.with(async () => {
  for (const table of tables) {
    $.logStep("Migrating", table);
    await migrate(table);
    pb.increment();
  }
});
```

### Composing with prompts

Selections and other prompts compose with active progress bars: the prompt renders below the bars, log lines stream in above, and the bars keep animating while the user chooses.

<video class="demo-video" muted loop playsinline preload="none" src="/videos/06_combined.mp4"></video>

```ts
$.logStep("Loaded", "config.json");
$.logStep("Connected", "to api.example.com");

const work = Promise.all(jobs.map(async (job) => {
  const pb = $.progress(`Processing ${job.name}`, { length: job.total });
  await pb.with(() => runJob(job, pb));
}));

const colour = await $.select({
  message: "What's your favourite colour?",
  options: ["Red", "Green", "Blue"],
});

await work;

$.logStep("Picked", colour.value);
```

### Synchronous work

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

### Non-TTY output

When stdout isn't a TTY (CI logs, piped or redirected output), the live UI is suppressed: the prefix and message are emitted as plain log lines whenever they're set, and the per-frame redraw is skipped. Your script behaves the same — the output just degrades gracefully to static lines instead of an animated bar.

## Path API <a class="anchor" href="#path">#</a> {#path}

The path API offers an immutable [`Path`](https://jsr.io/@david/path/doc/~/Path) class via [`jsr:@david/path`](https://jsr.io/@david/path), which is a similar concept to Rust's `PathBuf` struct.

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
textFile.writeSync("some text");
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

There are a lot of helper methods here, so check the [documentation on Path](https://jsr.io/@david/path/doc/~/Path) for more details.

## Helper functions <a class="anchor" href="#helpers">#</a> {#helpers}

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
$.stripAnsi("[4mHello World[0m");
//=> 'Hello World'
```

## CommandBuilder <a class="anchor" href="#command-builder">#</a> {#command-builder}

The builder APIs are what the library uses internally and they're useful for scenarios where you want to re-use some setup state. They're immutable so every function call returns a new object (which is the same thing that happens with the objects returned from `$` and `$.request`).

`CommandBuilder` can be used for building up commands similar to what the tagged template `$` does:

```ts
import { CommandBuilder } from "dax";

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

### Default Commands

The `CommandBuilder` will always have the default cross-platform commands registered. You can unregister them by using the `unregisterCommand` function:

```ts
const commandBuilder = new CommandBuilder()
  .unregisterCommand("printenv"); // will use what's on the system now
```

## RequestBuilder <a class="anchor" href="#request-builder">#</a> {#request-builder}

`RequestBuilder` can be used for building up requests similar to `$.request`:

```ts
import { RequestBuilder } from "dax";

const requestBuilder = new RequestBuilder()
  .header("SOME_VALUE", "some value to send in a header");

const result = await requestBuilder
  .url("https://example.com")
  .timeout("10s")
  .text();
```

## Custom `$` <a class="anchor" href="#custom-dollar">#</a> {#custom-dollar}

You may wish to create your own `$` function that has a certain setup context (for example, custom commands or functions on `$`, a defined environment variable or cwd). You may do this by using the exported `build$` with `CommandBuilder` and/or `RequestBuilder`, which is essentially what the main default exported `$` uses internally to build itself. In addition, you may also add your own functions to `$`:

```ts
import { build$, createExecutableCommand } from "dax";

// creates a $ object with the provided starting environment
const $ = build$({
  commandBuilder: (builder) =>
    builder
      .registerCommand("deno", createExecutableCommand(Deno.execPath()))
      .cwd("./subDir")
      .env("HTTPS_PROXY", "some_value"),
  requestBuilder: (builder) =>
    builder
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
const $ = build$({
  commandBuilder: (builder) =>
    builder.exportEnv()
      .noThrow(),
});

// since exportEnv() was set, this will now actually change
// the directory of the executing process
await $`cd test && export MY_VALUE=5`;
// will output "5"
await $`echo $MY_VALUE`;
// will both output it's in the test dir
await $`echo $PWD`;
// won't throw even though this command fails (because of `.noThrow()`)
await $`deno eval 'Deno.exit(1);'`;
```

### Building `$` from another `$`

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
