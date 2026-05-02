import $ from "../../mod.ts";

// indeterminate spinner — use when you don't know the total work
const pb = $.progress("Connecting to database");

await pb.with(async () => {
  // pretend to do work
  await $.sleep("3s");
});

$.logStep("Connected!");
