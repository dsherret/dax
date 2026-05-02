import $ from "../../mod.ts";

// .printCommand() echoes the resolved command in blue before it runs.
// Useful for build scripts where you want a record of what was executed.
$.setPrintCommand(true);

const target = "production";
await $`echo Deploying to ${target}...`;
await $`echo Build hash: abc123`;
await $`echo Done!`;
