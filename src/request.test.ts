import { assert, assertEquals, assertRejects } from "@std/assert";
import { Buffer } from "@std/io/buffer";
import { toWritableStream } from "@std/io/to-writable-stream";
import * as path from "@std/path";
import { isNode } from "which_runtime";
import $ from "../mod.ts";
import { TimeoutError } from "./common.ts";
import { RequestBuilder } from "./request.ts";
import { startServer } from "./test/server.deno.ts";

async function withServer(action: (serverUrl: URL) => Promise<void>) {
  const server = await startServer({
    handle(request) {
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
      } else if (url.pathname.startsWith("/sleep/")) {
        const ms = parseInt(url.pathname.replace(/^\/sleep\//, ""), 0);
        const signal = request.signal;
        return new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            resolve(new Response("", { status: 200 }));
          }, ms);
          signal.addEventListener("abort", () => {
            clearTimeout(timeoutId);
            reject(new Error("Client aborted."));
          });
        });
      } else if (url.pathname.startsWith("/sleep-body/")) {
        const ms = parseInt(url.pathname.replace(/^\/sleep-body\//, ""), 0);
        const signal = request.signal;
        const abortController = new AbortController();
        return new Response(
          new ReadableStream({
            start(controller) {
              return new Promise<void>((resolve, _reject) => {
                if (signal.aborted || abortController.signal.aborted) {
                  return;
                }
                const abortListener = () => {
                  clearTimeout(timeoutId);
                  controller.close();
                  resolve();
                  signal.removeEventListener("abort", abortListener);
                  abortController.signal.removeEventListener("abort", abortListener);
                };
                const timeoutId = setTimeout(abortListener, ms);
                signal.addEventListener("abort", abortListener);
                abortController.signal.addEventListener("abort", abortListener);
              });
            },
            cancel(reason) {
              abortController.abort(reason);
            },
          }),
          {
            status: 200,
          },
        );
      } else {
        return new Response("Not Found", { status: 404 });
      }
    },
  });

  try {
    await action(server.rootUrl);
  } catch (err) {
    throw err;
  } finally {
    try {
      await server.shutdown();
    } catch {
      // ignore
    }
  }
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
        .pipeTo(toWritableStream(buffer));
      const text = new TextDecoder().decode(buffer.bytes());
      assertEquals(text, "text".repeat(1000));
    });

    step("pipeThrough", async () => {
      const readable = await new RequestBuilder()
        .url(new URL("/text-file", serverUrl))
        .showProgress()
        .pipeThrough(new TextDecoderStream());
      const reader = readable.getReader();
      let result = "";
      let done = false;
      while (!done) {
        const chunkResult = await reader.read();
        done = chunkResult.done;
        if (chunkResult.value) {
          result += chunkResult.value;
        }
      }
      assertEquals(result, "text".repeat(1000));
    });

    step("pipeToPath", async () => {
      const testFilePath = await Deno.makeTempFile();
      const originDir = Deno.cwd();
      try {
        {
          const downloadedFilePath = await new RequestBuilder()
            .url(new URL("/text-file", serverUrl))
            .showProgress()
            .pipeToPath(testFilePath);
          assertEquals(downloadedFilePath.readTextSync(), "text".repeat(1000));
          assertEquals(downloadedFilePath.toString(), path.resolve(testFilePath));
        }
        {
          // test default path
          Deno.chdir(await Deno.makeTempDir()); // change path just to not download to the current dir
          const downloadedFilePath = await new RequestBuilder()
            .url(new URL("/text-file", serverUrl))
            .showProgress()
            .pipeToPath();
          assertEquals(downloadedFilePath.readTextSync(), "text".repeat(1000));
          assertEquals(downloadedFilePath.toString(), path.resolve("text-file"));
        }
        {
          await assertRejects(
            async () => {
              await new RequestBuilder()
                .url(new URL("/text-file", serverUrl))
                .showProgress()
                .pipeToPath({ createNew: true });
            },
            Deno.errors.AlreadyExists,
          );
          await assertRejects(
            async () => {
              await new RequestBuilder()
                .url(new URL("/text-file", serverUrl))
                .showProgress()
                .pipeToPath(undefined, { createNew: true });
            },
            Deno.errors.AlreadyExists,
          );
        }
        {
          // test downloading to a directory
          const tempDir = await Deno.makeTempDir();
          const downloadedFilePath = await new RequestBuilder()
            .url(new URL("/text-file", serverUrl))
            .showProgress()
            .pipeToPath(tempDir);
          assertEquals(downloadedFilePath.readTextSync(), "text".repeat(1000));
          assertEquals(downloadedFilePath.toString(), path.join(tempDir, "text-file"));
        }
      } finally {
        try {
          Deno.chdir(originDir);
          await Deno.remove(testFilePath);
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

    step("piping to a command", async () => {
      const requestBuilder = new RequestBuilder().url(new URL("/json", serverUrl));
      const data = await $`deno eval 'Deno.stdin.readable.pipeTo(Deno.stdout.writable)'`
        .stdin(requestBuilder)
        .json();
      assertEquals(data, { value: 5 });
    });

    step("piping to a command that errors", async () => {
      const requestBuilder = new RequestBuilder().url(new URL("/code/500", serverUrl));
      await assertRejects(
        () =>
          $`deno eval 'Deno.stdin.readable.pipeTo(Deno.stdout.writable)'`
            .stdin(requestBuilder)
            .json(),
        Error,
        "500",
      );
    });

    step("ensure times out waiting for body", async () => {
      const request = new RequestBuilder()
        .url(new URL("/sleep-body/10000", serverUrl))
        .timeout(200) // so high because CI was slow
        .showProgress();
      const response = await request.fetch();
      let caughtErr: TimeoutError | undefined;
      try {
        await response.text();
      } catch (err) {
        caughtErr = err;
      }
      if (isNode) {
        // seems like a bug in Node and Chrome where they throw a
        // DOMException instead, but not sure
        assert(caughtErr != null);
      } else {
        assertEquals(caughtErr!, new TimeoutError("Request timed out after 200 milliseconds."));
        assert(caughtErr!.stack!.includes("request.test.ts")); // current file
      }
    });

    step("ability to abort while waiting", async () => {
      const request = new RequestBuilder()
        .url(new URL("/sleep-body/10000", serverUrl))
        .showProgress();
      const response = await request.fetch();
      response.abort("Cancel.");
      let caughtErr: unknown;
      try {
        await response.text();
      } catch (err) {
        caughtErr = err;
      }
      if (isNode) {
        // seems like a bug in Node and Chrome where they throw a
        // DOMException instead, but not sure
        assert(caughtErr != null);
      } else {
        assertEquals(caughtErr, "Cancel.");
      }
    });

    step("use in a redirect", async () => {
      const request = new RequestBuilder()
        .url(new URL("/text-file", serverUrl))
        .showProgress();
      const text = await $`cat - && echo there && cat - < ${request}`.stdinText("hi").text();
      assertEquals(text, "hithere\n" + "text".repeat(1000));
    });

    step("use in a redirect that errors", async () => {
      const request = new RequestBuilder()
        .url(new URL("/code/500", serverUrl))
        .showProgress();
      const result = await $`cat - < ${request}`.noThrow().stderr("piped");
      assertEquals(
        result.stderr,
        `cat: Error making request to ${new URL("/code/500", serverUrl).toString()}: Internal Server Error\n`,
      );
      assertEquals(result.code, 1);
    });

    step("use in a redirect that times out waiting for the response", async () => {
      const request = new RequestBuilder()
        .url(new URL("/sleep/100", serverUrl))
        .timeout(10)
        .showProgress();
      const result = await $`cat - < ${request}`.noThrow().stderr("piped");
      assertEquals(
        result.stderr,
        "cat: Request timed out after 10 milliseconds.\n",
      );
      assertEquals(result.code, 1);
    });

    step("use in a redirect that times out waiting for the body", async () => {
      const request = new RequestBuilder()
        .url(new URL("/sleep-body/10_000", serverUrl))
        .timeout(10)
        .showProgress();
      const result = await $`cat - < ${request}`.noThrow().stderr("piped");
      assertEquals(
        result.stderr,
        "cat: Request timed out after 10 milliseconds.\n",
      );
      assertEquals(result.code, 1);
    });

    await Promise.all(steps);
  });
});
