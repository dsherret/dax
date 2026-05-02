// helper for 10_error_tail.ts — prints a few lines of "build" output then
// exits non-zero with an error trailer. Stdout/stderr are silenced by
// .quiet() in the caller, so the only way to see what went wrong is the
// errorTail captured tail surfaced in the thrown Error.
const steps = [
  "Resolving dependencies",
  "Fetched parser",
  "Fetched runtime",
  "Compiling core",
  "Compiling ui",
  "Compiling api",
  "Bundling output",
];

for (const step of steps) {
  console.log(step);
  await new Promise((r) => setTimeout(r, 220));
}

console.error("error: cannot find module './missing.ts'");
console.error("    at file:///app/src/api.ts:14:8");
Deno.exit(1);
