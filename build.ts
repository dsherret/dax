import { pack } from "../fuser/mod.ts";

await pack({
  entryPoint: "mod.ts",
  outputPath: "mod.js",
  typeCheck: true,
  testPath: "mod.test.ts",
});
