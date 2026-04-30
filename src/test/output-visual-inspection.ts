import { delay } from "@std/async/delay";
import $ from "../../mod.ts";
import { staticText } from "@david/console-static-text";

$.log("Welcome to the visual test of the progress bars.");

{
  $.log("The next item should show a progress bar with a spinner.");
  const alert = $.alert("Press any key...");
  const pb = $.progress("Doing action...");

  await pb.with(async () => {
    await alert;
  });
}

{
  $.log("Now the next thing will show multiple pb and a selection and log numbers");
  await delay(1_000);

  const pb = $.progress("Doing next action...");
  const pb2 = $.progress("Next one...");

  let i = 0;
  const interval = setInterval(() => {
    $.log((++i).toString());
  }, 1_000);

  const index = await $.select({
    message: "Make a selection",
    options: ["1", "2"],
  });
  pb2.finish();
  pb.finish();
  clearInterval(interval);

  $.log("Selected:", index);
}

{
  $.log(
    "Next: a prompt in a child process whose stdin is a pipe — should still respond to typed keys via the /dev/tty / CONIN$ fallback.",
  );
  await delay(1_000);

  const modUrl = import.meta.resolve("../../mod.ts");
  const childScript = `
import $ from ${JSON.stringify(modUrl)};
// drain the piped stdin so the parent's writer can close cleanly —
// the prompt itself should *not* read these bytes, it should read
// keystrokes from the controlling terminal via the fallback.
const piped = await new Response(process.stdin).text();
console.error("[child] piped stdin contained:", JSON.stringify(piped));
const choice = await $.select({
  message: "Pick one (child has piped stdin — type into your terminal)",
  options: ["alpha", "beta", "gamma"],
});
console.error("[child] selected:", choice.value);
`;

  // pipe benign data so stdin is a non-TTY pipe; the prompt should
  // bypass it entirely and read keys from the controlling terminal.
  await $`deno eval ${childScript}`.stdinText("piped data, not keystrokes\n");

  $.log("TTY fallback prompt complete.");
}

{
  $.log("The text below should show for a bit and then disappear.");
  using scope = staticText.createScope();
  const endTime = Date.now() + 1000;
  scope.setText(() => `All done in ${endTime - Date.now()}ms...`);
  await delay(1_000);
}

{
  const alert = $.alert("This should show below...");
  $.log("Next: three commands will run concurrently with `.tailDisplay()` — each pinned to a shared scrolling region.");
  await delay(1_000);

  const script = `
const label = Deno.args[0];
const count = parseInt(Deno.args[1]);
const interval = parseInt(Deno.args[2]);
for (let i = 0; i < count; i++) {
  console.log(\`[\${label}] line \${i.toString().padStart(2, "0")} \${Math.random().toString(36).slice(2, 10)}\`);
  await new Promise((r) => setTimeout(r, interval));
}
`;

  await Promise.all([
    $`deno eval ${script} alpha 30 100`.tailDisplay({ maxLines: 4 }),
    $`deno eval ${script} beta 25 120`.tailDisplay({ maxLines: 4 }),
    $`deno eval ${script} gamma 20 150`.tailDisplay({ maxLines: 4, header: "Testing..." }),
  ]);

  $.log("All commands done.");
  await alert;
}
