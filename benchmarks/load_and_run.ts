/**
 * Used by mod.bench.ts to test how long it takes to load
 * the wasm module.
 * @module
 */

import $ from "../mod.ts";

await $`echo "Hello, world!"`.text();
