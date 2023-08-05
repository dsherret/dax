import $ from "../mod.ts";

Deno.bench(async function loadWasmModule() {
  await $`deno run -A benchmarks/load_and_run.ts`;
});
