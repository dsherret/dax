import process from "node:process";
import $ from "../../mod.ts";

// reproduces the bug where aborted maybePrompts left dangling stdin reads
// that would silently swallow keystrokes from the next prompt.
//
// before the fix: the visible prompt at the end took N+1 enters to accept
// (one per aborted prompt that had a pending read, plus the real one).
// after the fix: a single enter accepts.

const ABORTED_COUNT = 3;

for (let i = 0; i < ABORTED_COUNT; i++) {
  const ac = new AbortController();
  // give the prompt a moment to display and call reader.read, then abort.
  setTimeout(() => ac.abort(), 500);
  const result = await $.maybePrompt({
    message: `prompt #${i + 1} (will be aborted)`,
    signal: ac.signal,
    noClear: true,
  });
  $.log(`  -> aborted prompt #${i + 1} resolved to:`, result);
}

$.log(
  `\nnow type something and press enter ONCE.\n`
    + `pre-fix: needed ~${ABORTED_COUNT + 1} enters before this prompt accepted input.\n`,
);

const answer = await $.prompt("final prompt");
$.log("got:", answer);

// after the prompts are done, stdin should be in a clean handoff-able
// state — read another line directly via process.stdin to confirm we
// haven't left listeners or a held lock that would block another reader.
$.log("\nnow type another line and press enter — read directly from process.stdin:");
const line = await new Promise<string>((resolve, reject) => {
  let buf = "";
  const onData = (chunk: Buffer) => {
    buf += chunk.toString("utf8");
    const newline = buf.indexOf("\n");
    if (newline === -1) return;
    cleanup();
    resolve(buf.slice(0, newline).replace(/\r$/, ""));
  };
  const onError = (err: Error) => {
    cleanup();
    reject(err);
  };
  const cleanup = () => {
    process.stdin.off("data", onData);
    process.stdin.off("error", onError);
    process.stdin.pause();
  };
  process.stdin.on("data", onData);
  process.stdin.on("error", onError);
  process.stdin.resume();
});
$.log("read via process.stdin:", line);
