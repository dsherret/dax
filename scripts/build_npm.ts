import { build, emptyDir } from "@deno/dnt";
import $ from "../mod.ts";

Deno.chdir($.path(import.meta.url).parentOrThrow().parentOrThrow().toString());

await emptyDir("./npm");

await build({
  entryPoints: ["./mod.ts"],
  outDir: "./npm",
  shims: {
    deno: {
      test: true,
    },
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
  compilerOptions: {
    stripInternal: false,
    skipLibCheck: false,
    lib: ["ESNext"],
    target: "ES2022",
  },
  mappings: {
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
for (const entry of walkJsFiles(npmPath.join("script").toString())) {
  $.path(entry).removeSync();
}
for (const entry of walkJsFiles(npmPath.join("esm").toString())) {
  $.path(entry).removeSync();
}

function* walkJsFiles(dir: string): Generator<string> {
  for (const entry of Deno.readDirSync(dir)) {
    const entryPath = `${dir}/${entry.name}`;
    if (entry.isDirectory) {
      yield* walkJsFiles(entryPath);
    } else if (entry.isFile && entry.name.endsWith(".js")) {
      yield entryPath;
    }
  }
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
