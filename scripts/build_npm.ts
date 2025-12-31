import { build, emptyDir } from "@deno/dnt";
import { walkSync } from "@std/fs/walk";
import $ from "../mod.ts";

Deno.chdir($.path(import.meta.url).parentOrThrow().parentOrThrow().toString());

await emptyDir("./npm");

await build({
  entryPoints: ["./mod.ts"],
  outDir: "./npm",
  importMap: "./deno.json",
  shims: {
    deno: true,
    custom: [{
      package: {
        name: "node:util",
      },
      globalNames: [
        "TextDecoder",
      ],
    }, {
      package: {
        name: "node:stream/web",
      },
      globalNames: [
        "ReadableStream",
        "WritableStream",
        "TextDecoderStream",
        "TransformStream",
        {
          name: "StreamPipeOptions",
          typeOnly: true,
        },
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
  filterDiagnostic(diagnostic) {
    return !diagnostic.file?.fileName.includes("@david/path/0.2.0/mod.ts");
  },
  compilerOptions: {
    stripInternal: false,
    skipLibCheck: false,
    lib: ["ESNext"],
    target: "ES2022",
  },
  mappings: {
    "./src/runtimes/process.deno.ts": "./src/runtimes/process.node.ts",
    "./src/test/server.deno.ts": "./src/test/server.node.ts",
  },
  package: {
    name: "dax",
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
      "@types/node": "^22.5.0",
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
for (const entry of walkSync(npmPath.join("script").toString(), { includeDirs: false, exts: ["js"] })) {
  $.path(entry.path).removeSync();
}
for (const entry of walkSync(npmPath.join("esm").toString(), { includeDirs: false, exts: ["js"] })) {
  $.path(entry.path).removeSync();
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
