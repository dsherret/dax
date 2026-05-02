// helper for 07_tail_display.ts — emits a stream of fake build output so
// the tail display has interesting lines to scroll through. Accepts a name
// arg so multiple instances can run in parallel and stay distinguishable.
const name = Deno.args[0] ?? "build";

const steps = [
  "Resolving dependencies",
  `Fetched ${name}/parser`,
  `Fetched ${name}/runtime`,
  `Compiling ${name}/core`,
  `Compiling ${name}/ui`,
  `Compiling ${name}/api`,
  `Linking ${name}`,
  `Bundling ${name}.js`,
  "Optimizing chunks",
  `Writing dist/${name}.js`,
  `${name} done`,
];

// stagger speeds so the two builds finish at different times
const stepDelayMs = name === "frontend" ? 280 : 380;

for (const step of steps) {
  console.log(`[${name}] ${step}`);
  await new Promise((r) => setTimeout(r, stepDelayMs));
}
