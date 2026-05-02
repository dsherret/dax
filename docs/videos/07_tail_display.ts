import $ from "../../mod.ts";

// .tailDisplay() pins recent output to a fixed region.
// concurrent tailing commands compose into a shared scrolling area —
// multiple builds run in parallel without spilling over each other.
await Promise.all([
  $`deno run -A 07a_fake_build.ts frontend`.tailDisplay({ maxLines: 3 }),
  $`deno run -A 07a_fake_build.ts backend`.tailDisplay({ maxLines: 3 }),
]);

$.logStep("All builds complete");
