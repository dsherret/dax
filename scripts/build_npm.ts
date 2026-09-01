import { build, emptyDir } from "@deno/dnt";
import $ from "../mod.ts";

Deno.chdir($.path(import.meta.url).parentOrThrow().parentOrThrow().toString());

await emptyDir("./npm");

await build({
  entryPoints: ["./mod.ts"],
  outDir: "./npm",
  scriptModule: false,
  shims: {
    deno: {
      test: "dev",
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
          name: "ReadableStreamReadResult",
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
    "jsr:@david/shell": "@dsherret/shell",
    "jsr:@david/shell/internal": {
      name: "@dsherret/shell",
      subPath: "internal",
    },
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
    keywords: [
      "shell",
      "scripting",
      "spawn",
      "process",
    ],
    bugs: {
      url: "https://github.com/dsherret/dax/issues",
    },
    dependencies: {
      "undici-types": "^5.26",
    },
    devDependencies: {
      "@types/node": "^22.18.0",
    },
  },
  postBuild() {
    Deno.copyFileSync("LICENSE", "npm/LICENSE");
    Deno.copyFileSync("README.md", "npm/README.md");
  },
});

// create bundle to improve startup time
await $`deno run -A npm:esbuild@0.20.0 --bundle --platform=node --packages=external --format=esm --outfile=npm/bundle.mjs npm/esm/mod.js`;

const npmPath = $.path("npm");

// remove all the javascript files in the esm folder
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

// move the bundle to the esm folder
npmPath.join("bundle.mjs").renameSync(npmPath.join("esm/mod.js"));

// basic mjs test
{
  const tempFile = $.path("temp_file.mjs");
  tempFile.writeSync(
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
