---
layout: layout.vto
---

<section class="intro hero" id="overview">
  <div>
    <h4 class="eyebrow">v0.45 · MIT licensed</h4>
    <h1>Shell scripting,<br/>without the platform&nbsp;tax.</h1>
    <p class="lede">
      dax is a cross-platform toolkit for Deno and Node.js — a friendlier <code>$</code> for spawning processes, with a built-in shell parser, built-in commands, prompts, requests, and a tidy <code>Path</code> API.
    </p>
    <div class="badges">
      <span class="badge jsr"><span class="b-l">JSR</span><span class="b-r">@david/dax</span></span>
      <span class="badge npm"><span class="b-l">npm</span><span class="b-r">dax</span></span>
      <span class="badge"><span class="b-l">deno</span><span class="b-r">≥ 1.40</span></span>
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

## Install <a class="anchor" href="#install">#</a> {#install}

dax runs on Deno and Node.js. Pick a runtime — the API is identical.

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

> **No CLI to learn.** dax is a library — you import `$` and call it like any other function. Existing scripts keep working.

## Your first script <a class="anchor" href="#first-script">#</a> {#first-script}

The default export `$` is a tagged template that runs a command and resolves to its result. Strings are escaped for you.

```ts
#!/usr/bin/env -S deno run --allow-all
import $ from "dax";

// run a command
await $`echo 5`; // outputs: 5

// run things in parallel
await Promise.all([
  $`sleep 1 ; echo 1`,
  $`sleep 2 ; echo 2`,
  $`sleep 3 ; echo 3`,
]);
```

<div class="feature-grid">
  <div class="feat">
    <span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg></span>
    <h3>Cross-platform shell</h3>
    <p>Same syntax on macOS, Linux, and Windows — no <code>cmd.exe</code> surprises.</p>
  </div>
  <div class="feat">
    <span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16v6H4zM4 14h16v6H4z"/><circle cx="8" cy="7" r="1"/><circle cx="8" cy="17" r="1"/></svg></span>
    <h3>Built-in commands</h3>
    <p><code>cp</code>, <code>mv</code>, <code>rm</code>, <code>cat</code>, <code>mkdir</code> — they just work, everywhere.</p>
  </div>
  <div class="feat">
    <span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18M12 3v18"/></svg></span>
    <h3>Prompts &amp; progress</h3>
    <p><code>$.confirm</code>, <code>$.select</code>, <code>$.progress</code> — all batteries included.</p>
  </div>
  <div class="feat">
    <span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7l8-4 8 4-8 4-8-4z"/><path d="M4 12l8 4 8-4M4 17l8 4 8-4"/></svg></span>
    <h3>Tiny global surface</h3>
    <p>One default <code>$</code>, no globals leaked into your runtime.</p>
  </div>
</div>

## Executing commands <a class="anchor" href="#executing">#</a> {#executing}

Templates are parsed by the cross-platform shell, so pipes, redirects, and operators behave consistently across OSes.

```ts
await $`echo 1 && deno run main.ts`;

// pipe sequences
await $`(echo foo && echo bar) | grep foo`;
```

## Getting output <a class="anchor" href="#getting-output">#</a> {#getting-output}

Append a method on the awaitable to coerce stdout into the shape you need. These calls automatically silence stdout.

```ts
const text  = await $`echo 1`.text();              // "1"
const data  = await $`echo '{"x":5}'`.json();      // { x: 5 }
const bytes = await $`gzip < file.txt`.bytes();    // Uint8Array
const lines = await $`echo 1 && echo 2`.lines();   // ["1","2"]
```

### Streaming line-by-line

Iterate without buffering — break early to kill the child.

```ts
for await (const line of $`cat big.txt`.linesIter()) {
  console.log(line);
}
```

## Exit codes <a class="anchor" href="#exit-codes">#</a> {#exit-codes}

Non-zero exits throw by default. Use `.noThrow()` when you want to handle the code yourself.

```ts
const result = await $`exit 123`.noThrow();
console.log(result.code); // 123

// or just get the code
const code = await $`git diff --quiet`.code();
```

## Piping &amp; redirects <a class="anchor" href="#piping">#</a> {#piping}

Pipe between commands, into `WritableStream`s, into files, or into `Uint8Array` buffers — directly from a redirect operator.

```ts
// command to command
const out = await $`echo foo && echo bar`
  .pipe($`grep foo`)
  .text();

// straight to a path
await $`echo 1 > ${$.path("data.txt")}`;

// JS objects in redirect slots
const buf = new Uint8Array(2);
await $`echo 1 && (echo 2 > ${buf}) && echo 3`;
```

## Providing arguments <a class="anchor" href="#arguments">#</a> {#arguments}

Interpolations are escaped automatically. Pass arrays for multi-arg, opt out per-arg with `$.rawArg`, or opt out fully with `$.raw`.

```ts
const dir = "Dir with spaces";
await $`mkdir ${dir}`;
// → mkdir 'Dir with spaces'

const names = ["some_dir", "other dir"];
await $`mkdir ${names}`;
// → mkdir some_dir 'other dir'

// raw escape hatches
const args = "arg1   arg2";
await $`echo ${$.rawArg(args)}`;
await $.raw`echo ${args}`;
```

## Env &amp; cwd <a class="anchor" href="#env">#</a> {#env}

```ts
await $`echo $a $b`
  .env("a", "1")
  .env({ b: "2" })
  .cwd("./subDir");
```

### Exporting the shell's env

Shell mutations are local by default. `.exportEnv()` bubbles them back into the host process.

```ts
await $`cd src && export MY_VALUE=5`.exportEnv();
await $`echo $MY_VALUE`; // 5
console.log(Deno.cwd()); // .../src
```

## Timeout &amp; abort <a class="anchor" href="#timeout">#</a> {#timeout}

```ts
// exits with code 124 after 1s
await $`sleep 100 && echo 2`.timeout("1s");

// abort manually via spawn()
const child = $`sleep 100`.spawn();
await doSomeOtherWork();
child.kill();   // SIGTERM by default
await child;       // throws: Aborted with exit code: 124
```

## Tail display <a class="anchor" href="#tail-display">#</a> {#tail-display}

Pin the last few lines of a long-running command to a fixed region (Docker-style). On success the live region clears; on failure the full output stays in scrollback.

```ts
await $`./build.sh`.tailDisplay();

// concurrent tails compose into one shared region
await Promise.all([
  $`./build.sh frontend`.tailDisplay({ maxLines: 4 }),
  $`./build.sh backend`.tailDisplay({ maxLines: 4 }),
]);
```

## The cross-platform shell <a class="anchor" href="#shell">#</a> {#shell}

dax embeds the parser from `deno_task_shell`, so you get the same grammar everywhere — sequential lists, boolean ops, pipes, redirects, sub-shells, and variable substitution.

```ts
await $`
  echo one
  echo two
  echo three
`;
```

Multi-line input runs with `errexit` on by default — the first failing line stops the rest. Single-line input continues on failure. Toggle with `set -e` / `set +e`.

## Built-in commands <a class="anchor" href="#builtins">#</a> {#builtins}

These ship cross-platform — flags don't always match GNU one-for-one, but the common ones are covered.

<div class="cmd-grid">
  <div class="cmd">cd</div><div class="cmd">echo</div><div class="cmd">exit</div>
  <div class="cmd">cp</div><div class="cmd">mv</div><div class="cmd">rm</div>
  <div class="cmd">mkdir</div><div class="cmd">pwd</div><div class="cmd">touch</div>
  <div class="cmd">cat</div><div class="cmd">test</div><div class="cmd">printenv</div>
  <div class="cmd">unset</div><div class="cmd">which</div><div class="cmd">sleep</div>
  <div class="cmd">true</div><div class="cmd">false</div><div class="cmd">set</div>
  <div class="cmd">shopt</div>
</div>

Need a custom one? Register it on the builder with `.registerCommand("name", handler)`.

## Shell options <a class="anchor" href="#shell-options">#</a> {#shell-options}

Configure via `set` / `shopt` inside scripts, or up-front on a custom `$`.

```ts
const $ = build$({
  commandBuilder: (b) =>
    b.pipefail()
     .nullglob()
     .failglob()
     .globstar(false)
     .questionGlob(),
});
```

## Requests <a class="anchor" href="#requests">#</a> {#requests}

A thin builder around `fetch` that throws on non-2xx and reads the body in one chained call.

```ts
const data = await $.request("https://plugins.dprint.dev/info.json").json();
console.log(data.plugins);

// pipe a download into a command, with progress
const req = $.request("https://example.com/big.zip").showProgress();
await $`deno run main.ts`.stdin(req);
```

## Prompts <a class="anchor" href="#prompts">#</a> {#prompts}

Built-in TTY prompts. The `maybe*` variants return `null` on Ctrl+C instead of exiting.

```ts
const name = await $.prompt("What's your name?");
const go   = await $.confirm("Continue?", { default: true });

const color = await $.select({
  message: "Favourite colour?",
  options: ["Red", "Green", "Blue"],
});

const days = await $.multiSelect({
  message: "Days of the week?",
  options: ["Monday", { text: "Wednesday", selected: true }, "Blue"],
});
```

## Progress indicators <a class="anchor" href="#progress">#</a> {#progress}

Indeterminate spinners and determinate bars. `.with()` auto-clears on success or error.

```ts
const pb = $.progress("Processing items", { length: items.length });

await pb.with(async () => {
  for (const it of items) {
    await doWork(it);
    pb.increment();
  }
});
```

## Path API <a class="anchor" href="#path">#</a> {#path}

An immutable `Path` class — like Rust's `PathBuf`. Joins, queries, reads, writes, and JSON serialization in one type.

```ts
let src = $.path("src").resolve();
await src.mkdir();

const cfg = src.join("config", "app.json");
cfg.writeJsonSync({ port: 8080 });
console.log(cfg.readJsonSync().port); // 8080
```

## Logging <a class="anchor" href="#logging">#</a> {#logging}

Coloured, indentation-aware helpers. Everything goes to stderr by default — swap loggers to redirect.

```ts
$.log("Hello!");
$.logStep("Fetching data from server...");
$.logError("Error Some error message.");
$.logWarn("Warning Some warning message.");
$.logLight("Some unimportant message.");

await $.logGroup(async () => {
  $.log("Indented one level.");
});
```

## Helpers <a class="anchor" href="#helpers">#</a> {#helpers}

```ts
await $.sleep("1m30s");
await $.which("deno");
await $.commandExists("git");

await $.withRetries({
  count: 5,
  delay: "5s",
  action: async () => { await $`cargo publish`; },
});

$.dedent`
    indented input
      with relative leading space preserved
  `;
```

## Builder APIs <a class="anchor" href="#api">#</a> {#api}

Everything `$` does is built on two immutable builders. Use them when you want to share setup across many commands.

```ts
import { CommandBuilder } from "dax";

const base = new CommandBuilder()
  .cwd("./subDir")
  .stdout("inheritPiped")
  .noThrow();

await base.command("deno run my_script.ts").spawn();
```

## Custom `$` <a class="anchor" href="#custom-dollar">#</a> {#custom-dollar}

Compose your own `$` with shared env, headers, custom commands, and bonus helpers under `extras`.

```ts
import { build$, createExecutableCommand } from "dax";

const $ = build$({
  commandBuilder: (b) =>
    b.registerCommand("deno", createExecutableCommand(Deno.execPath()))
     .env("HTTPS_PROXY", "…"),
  requestBuilder: (b) => b.header("X-Auth", "…"),
  extras: {
    add(a, b) { return a + b; },
  },
});

await $`deno run my_script.ts`;
console.log($.add(1, 2));
```

> **Pro tip:** set `$.setPrintCommand(true)` or build a `$` with `.exportEnv()` on by default to make your scripts behave more like a real shell session.
