import { build$, CommandBuilder, createExecutableCommand } from "../../mod.ts";

const commandBuilder = new CommandBuilder()
  .registerCommand(
    "build",
    createExecutableCommand("deno", {
      args: ["run", "-A", "10a_fake_failing_build.ts"],
    }),
  );

const $ = build$({ commandBuilder });

// .quiet() hides stdout/stderr, so a failure normally gives no clues.
// .errorTail() retains the trailing bytes and surfaces them in the
// thrown error message — just enough to see what blew up.
$.logStep("Running", "build");
try {
  await $`build`.errorTail({ maxBytes: 512 }).quiet();
} catch (err) {
  $.logError("Build failed");
  console.error((err as Error).message);
}
