import {
  build,
  emptyDir,
} from "https://raw.githubusercontent.com/denoland/dnt/2a144787a696cdb6bf3488358edf5f76bd296767/mod.ts";
import $ from "../mod.ts";

$.cd($.path(import.meta).parentOrThrow().parentOrThrow());

await emptyDir("./npm");

await build({
  entryPoints: ["./mod.ts"],
  outDir: "./npm",
  shims: {
    deno: true,
    custom: [{
      package: {
        name: "node:stream/web",
      },
      globalNames: [
        "ReadableStream",
        "WritableStream",
        "TextDecoderStream",
        "TransformStream",
        {
          name: "ReadableStreamDefaultReader",
          typeOnly: true,
        },
        {
          name: "WritableStreamDefaultWriter",
          typeOnly: true,
        },
        {
          name: "PipeOptions",
          exportName: "StreamPipeOptions",
          typeOnly: true,
        },
        {
          name: "QueuingStrategy",
          typeOnly: true,
        },
      ],
    }, {
      package: {
        name: "undici-types",
      },
      globalNames: [{
        name: "BodyInit",
        typeOnly: true,
      }, {
        name: "RequestCache",
        typeOnly: true,
      }, {
        name: "RequestMode",
        typeOnly: true,
      }, {
        name: "RequestRedirect",
        typeOnly: true,
      }, {
        name: "ReferrerPolicy",
        typeOnly: true,
      }],
    }],
  },
  compilerOptions: {
    stripInternal: false,
    skipLibCheck: false,
    target: "ES2022",
  },
  mappings: {
    "./src/runtimes/process.deno.ts": "./src/runtimes/process.node.ts",
    "./src/test/server.deno.ts": "./src/test/server.node.ts",
  },
  package: {
    name: "dax-sh",
    version: Deno.args[0],
    description: "Cross platform shell tools inspired by zx.",
    license: "MIT",
    repository: {
      type: "git",
      url: "git+https://github.com/dsherret/dax.git",
    },
    bugs: {
      url: "https://github.com/dsherret/dax/issues",
    },
    dependencies: {
      "@deno/shim-deno": "~0.19.0",
      "undici-types": "^5.26",
    },
    devDependencies: {
      "@types/node": "^20.11.9",
    },
  },
  postBuild() {
    Deno.copyFileSync("LICENSE", "npm/LICENSE");
    Deno.copyFileSync("README.md", "npm/README.md");
  },
});

// create bundles to improve startup time
await $`deno run -A npm:esbuild@0.20.0 --bundle --platform=node --packages=external --outfile=npm/bundle.cjs npm/script/mod.js`;
await $`deno run -A npm:esbuild@0.20.0 --bundle --platform=node --packages=external --format=esm --outfile=npm/bundle.mjs npm/esm/mod.js`;

const npmPath = $.path("npm");

// remove all the javascript files in the script folder
for (const entry of npmPath.join("script").walkSync({ exts: ["js"] })) {
  entry.path.removeSync();
}
for (const entry of npmPath.join("esm").walkSync({ exts: ["js"] })) {
  entry.path.removeSync();
}

// move the bundle to the script folder
npmPath.join("bundle.cjs").renameSync(npmPath.join("script/mod.js"));
npmPath.join("bundle.mjs").renameSync(npmPath.join("esm/mod.js"));

// basic mjs test
{
  const tempFile = $.path("temp_file.mjs");
  tempFile.writeText(
    `import $ from "./npm/esm/mod.js";

await $\`echo 1\`;
`,
  );
  try {
    // just ensure it doesn't throw
    await $`node ${tempFile}`.quiet();
  } finally {
    tempFile.removeSync();
  }
}

// basic cjs test
{
  const tempFile = $.path("temp_file.cjs");
  tempFile.writeText(
    `const $ = require("./npm/script/mod.js").$;

$\`echo 1\`.then(() => {
console.log("DONE");
});
`,
  );
  try {
    // just ensure it doesn't throw
    await $`node ${tempFile}`.quiet();
  } finally {
    tempFile.removeSync();
  }
}
