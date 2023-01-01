import { Buffer } from "./deps.ts";
import { assertEquals, assertRejects, serve, writableStreamFromWriter } from "./deps.test.ts";
import { RequestBuilder } from "./request.ts";

function withServer(action: (serverUrl: URL) => Promise<void>) {
  const controller = new AbortController();
  const signal = controller.signal;
  return new Promise<void>((resolve, reject) => {
    serve((request) => {
      const url = new URL(request.url);
      if (url.pathname === "/text-file") {
        const data = "text".repeat(1000);
        return new Response(data, { status: 200 });
      } else if (url.pathname === "/json") {
        const data = JSON.stringify({
          value: 5,
        });
        return new Response(data, { status: 200 });
      } else if (url.pathname === "/headers") {
        const data = JSON.stringify(Object.fromEntries(request.headers.entries()));
        return new Response(data, { status: 200 });
      } else if (url.pathname.startsWith("/code/")) {
        const code = parseInt(url.pathname.replace(/^\/code\//, ""), 0);
        return new Response(code.toString(), { status: code });
      } else {
        return new Response("Not Found", { status: 404 });
      }
    }, {
      hostname: "localhost",
      signal,
      async onListen(details) {
        const url = new URL(`http://${details.hostname}:${details.port}/`);
        try {
          await action(url);
          resolve();
          controller.abort();
        } catch (err) {
          reject(err);
          controller.abort();
        }
      },
    });
  });
}

Deno.test("$.request", (t) => {
  return withServer(async (serverUrl) => {
    const steps: Promise<boolean>[] = [];
    const step = (name: string, fn: () => Promise<any>) => {
      steps.push(t.step({
        name,
        fn,
        sanitizeExit: false,
        sanitizeOps: false,
        sanitizeResources: false,
      }));
    };

    step("json", async () => {
      const data = await new RequestBuilder()
        .url(new URL("/json", serverUrl))
        .json();
      assertEquals(data, { value: 5 });
    });

    step("arrayBuffer", async () => {
      const data = await new RequestBuilder()
        .url(new URL("/text-file", serverUrl))
        .arrayBuffer();
      assertEquals(new Uint8Array(data), new TextEncoder().encode("text".repeat(1000)));
    });

    step("blob", async () => {
      const data = await new RequestBuilder()
        .url(new URL("/text-file", serverUrl))
        .blob();
      assertEquals(
        new Uint8Array(await data.arrayBuffer()),
        new TextEncoder().encode("text".repeat(1000)),
      );
    });

    step("text", async () => {
      const data = await new RequestBuilder()
        .url(new URL("/text-file", serverUrl))
        .text();
      assertEquals(data, "text".repeat(1000));
    });

    step("pipeTo", async () => {
      const buffer = new Buffer();
      await new RequestBuilder()
        .url(new URL("/text-file", serverUrl))
        .showProgress()
        .pipeTo(writableStreamFromWriter(buffer));
      const text = new TextDecoder().decode(buffer.bytes());
      assertEquals(text, "text".repeat(1000));
    });

    step("pipeThrough", async () => {
      const readable = await new RequestBuilder()
        .url(new URL("/text-file", serverUrl))
        .showProgress()
        .pipeThrough(new TextDecoderStream());
      const reader = readable.getReader();
      const result = await reader.read();
      assertEquals(result.value, "text".repeat(1000));
    });

    step("pipeToPath", async () => {
      const testFilePath = Deno.makeTempFileSync();
      const originDir = Deno.cwd();
      try {
        const downloadedFilePath = await new RequestBuilder()
          .url(new URL("/text-file", serverUrl))
          .showProgress()
          .pipeToPath(testFilePath);
        assertEquals(Deno.readTextFileSync(testFilePath), "text".repeat(1000));
        assertEquals(downloadedFilePath, testFilePath);
        // test default path
        Deno.chdir(Deno.makeTempDirSync()); // change path just to not download to the current dir
        const downloadedFilePath2 = await new RequestBuilder()
          .url(new URL("/text-file", serverUrl))
          .showProgress()
          .pipeToPath();
        assertEquals(Deno.readTextFileSync(testFilePath), "text".repeat(1000));
        assertEquals(downloadedFilePath2, "text-file");
      } finally {
        try {
          Deno.chdir(originDir);
          Deno.removeSync(testFilePath);
          Deno.removeSync("text-file");
        } catch {
          // do nothing
        }
      }
    });

    step("headers", async () => {
      const data = {
        valuea: "a",
        valueb: "b",
      };
      const result = await new RequestBuilder()
        .url(new URL("/headers", serverUrl))
        .header(data)
        .json();
      assertEquals({
        valuea: result["valuea"],
        valueb: result["valueb"],
      }, data);
    });

    step("404", async () => {
      const request404 = new RequestBuilder()
        .url(new URL("/code/404", serverUrl));
      assertRejects(
        async () => {
          await request404.text();
        },
        Error,
        "Not Found",
      );

      assertEquals(await request404.noThrow(404).blob(), undefined);
      assertEquals(await request404.noThrow(404).arrayBuffer(), undefined);
      assertEquals(await request404.noThrow(404).json(), undefined);
      assertEquals(await request404.noThrow(404).formData(), undefined);
      assertEquals(await request404.noThrow(404).text(), undefined);
    });

    step("500", async () => {
      const request500 = new RequestBuilder()
        .url(new URL("/code/500", serverUrl));
      assertRejects(
        async () => {
          await request500.text();
        },
        Error,
        "500",
      );

      assertEquals(await request500.noThrow(500).text(), "500");
    });

    await Promise.all(steps);
  });
});
