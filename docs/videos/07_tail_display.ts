import { $ as main$, build$, CommandBuilder, createExecutableCommand } from "../../mod.ts";

const commandBuilder = new CommandBuilder()
  .registerCommand(
    "deno",
    createExecutableCommand(main$.whichSync("deno"), {
      args: ["run", "-A", "07a_fake_build.ts"],
    }),
  );

const $ = build$({ commandBuilder });

// .tailDisplay() pins recent output to a fixed region.
// concurrent tailing commands compose into a shared scrolling area —
// multiple builds run in parallel without spilling over each other.
await Promise.all([
  $`deno task build frontend`.tailDisplay({ maxLines: 3 }),
  $`deno task build backend`.tailDisplay({ maxLines: 3 }),
]);

$.log("All builds complete");
