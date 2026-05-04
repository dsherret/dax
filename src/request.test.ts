import { assert, assertEquals, assertRejects } from "@std/assert";
import { Buffer } from "@std/io/buffer";
import { toWritableStream } from "@std/io/to-writable-stream";
import * as path from "node:path";
import { isNode } from "which_runtime";
import $ from "../mod.ts";
import * as fs from "node:fs";
import * as os from "node:os";
import * as nodePath from "node:path";
import { RequestBuilder, RequestResponse } from "./request.ts";
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
                  try {
                    controller.close();
                  } catch {
                    // ignore
                  }
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

    step("onProgress reports cumulative bytes", async () => {
      const events: { loaded: number; total: number | undefined }[] = [];
      const data = await new RequestBuilder()
        .url(new URL("/text-file", serverUrl))
        .onProgress((event) => events.push(event))
        .text();
      assertEquals(data, "text".repeat(1000));
      assert(events.length > 0, "expected at least one progress event");
      // total is whatever the server reports via content-length (or undefined),
      // but it must be the same value on every event
      const total = events[0].total;
      // loaded must be monotonically non-decreasing and end at the body size
      let prev = 0;
      for (const event of events) {
        assertEquals(event.total, total);
        assert(event.loaded >= prev, `loaded went backwards: ${prev} -> ${event.loaded}`);
        prev = event.loaded;
      }
      assertEquals(events[events.length - 1].loaded, 4 * 1000);
    });

    step("onProgress invokes multiple callbacks", async () => {
      let firstCount = 0;
      let secondCount = 0;
      const data = await new RequestBuilder()
        .url(new URL("/text-file", serverUrl))
        .onProgress(() => {
          firstCount++;
        })
        .onProgress(() => {
          secondCount++;
        })
        .text();
      assertEquals(data, "text".repeat(1000));
      assert(firstCount > 0);
      assertEquals(firstCount, secondCount);
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
      const tempDirs: string[] = [];
      const mkTempDir = async () => {
        const dir = await fs.promises.mkdtemp(nodePath.join(os.tmpdir(), "dax-"));
        tempDirs.push(dir);
        return dir;
      };
      const tempRoot = await mkTempDir();
      const testFilePath = nodePath.join(tempRoot, "tmp");
      await fs.promises.writeFile(testFilePath, "");
      const originDir = process.cwd();
      try {
        {
          // ensure that a truncate happens
          $.path(testFilePath).writeSync("text".repeat(1002));
          const downloadedFilePath = await new RequestBuilder()
            .url(new URL("/text-file", serverUrl))
            .showProgress()
            .pipeToPath(testFilePath);
          assertEquals(downloadedFilePath.readTextSync(), "text".repeat(1000));
          assertEquals(downloadedFilePath.toString(), path.resolve(testFilePath));
        }
        {
          // test default path
          process.chdir(await mkTempDir()); // change path just to not download to the current dir
          const downloadedFilePath = await new RequestBuilder()
            .url(new URL("/text-file", serverUrl))
            .showProgress()
            .pipeToPath();
          assertEquals(downloadedFilePath.readTextSync(), "text".repeat(1000));
          assertEquals(downloadedFilePath.toString(), path.resolve("text-file"));
        }
        {
          const alreadyExistsErr = await assertRejects(async () => {
            await new RequestBuilder()
              .url(new URL("/text-file", serverUrl))
              .showProgress()
              .pipeToPath({ createNew: true });
          });
          assert((alreadyExistsErr as any)?.code === "EEXIST", `expected EEXIST, got ${alreadyExistsErr}`);
          const alreadyExistsErr2 = await assertRejects(async () => {
            await new RequestBuilder()
              .url(new URL("/text-file", serverUrl))
              .showProgress()
              .pipeToPath(undefined, { createNew: true });
          });
          assert((alreadyExistsErr2 as any)?.code === "EEXIST", `expected EEXIST, got ${alreadyExistsErr2}`);
        }
        {
          // test downloading to a directory
          const tempDir = await mkTempDir();
          const downloadedFilePath = await new RequestBuilder()
            .url(new URL("/text-file", serverUrl))
            .showProgress()
            .pipeToPath(tempDir);
          assertEquals(downloadedFilePath.readTextSync(), "text".repeat(1000));
          assertEquals(downloadedFilePath.toString(), path.join(tempDir, "text-file"));
        }
      } finally {
        // restore the cwd before cleaning up temp dirs (Windows can't rm the current cwd)
        process.chdir(originDir);
        for (const dir of tempDirs) {
          await fs.promises.rm(dir, { recursive: true, force: true });
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

    step("beforeRequest async return", async () => {
      // returning the builder directly from an async callback should NOT
      // trigger a fetch via thenable-unwrapping; both hooks should be applied
      const result = await new RequestBuilder()
        .url(new URL("/headers", serverUrl))
        .beforeRequest(async (builder) => {
          await new Promise((r) => setTimeout(r, 0));
          return builder.header("authorization", "Bearer token-xyz");
        })
        .beforeRequest((builder) => builder.header("x-second", "yes"))
        .json();
      assertEquals(result["authorization"], "Bearer token-xyz");
      assertEquals(result["x-second"], "yes");
    });

    step("beforeRequest survives chained method calls", async () => {
      // `.header(...).header(...).method(...)` — every intermediate builder
      // must remain non-thenable so the final return doesn't get unwrapped
      const result = await new RequestBuilder()
        .url(new URL("/headers", serverUrl))
        .beforeRequest(async (builder) => {
          await new Promise((r) => setTimeout(r, 0));
          return builder
            .header("a", "1")
            .header("b", "2")
            .header("c", "3")
            .method("GET");
        })
        .json();
      assertEquals(result["a"], "1");
      assertEquals(result["b"], "2");
      assertEquals(result["c"], "3");
    });

    step("beforeRequest no-op when nothing returned", async () => {
      const result = await new RequestBuilder()
        .url(new URL("/headers", serverUrl))
        .header("x-flag", "1")
        .beforeRequest(() => {})
        .json();
      assertEquals(result["x-flag"], "1");
    });

    step("404", async () => {
      const request404 = new RequestBuilder()
        .url(new URL("/code/404", serverUrl));
      await assertRejects(
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
      await assertRejects(
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
      const data = await $`cat -`
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
      let caughtErr: Error | undefined;
      let response: Awaited<ReturnType<typeof request.fetch>> | undefined;
      let threwInText = false;
      try {
        response = await request.fetch();
      } catch (err: any) {
        caughtErr = err;
      }
      if (response != null) {
        try {
          await response.text();
        } catch (err: any) {
          caughtErr = err;
          threwInText = true;
        }
      }
      if (isNode) {
        // seems like a bug in Node and Chrome where they throw a
        // DOMException instead, but not sure
        assert(caughtErr != null);
      } else {
        assertEquals(caughtErr!.message, "Request timed out after 200 milliseconds.");
        if (threwInText) {
          // only reliable when the timeout fires during text() — when it fires
          // during fetch() on slow CI, the recapture happens in microtask context
          // and the user frame is lost
          assert(caughtErr!.stack!.includes("request.test.ts")); // current file
        }
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

    step("signal aborts request", async () => {
      const controller = new AbortController();
      setTimeout(() => controller.abort("Cancelled."), 50);
      await assertRejects(
        () =>
          new RequestBuilder()
            .url(new URL("/sleep/10000", serverUrl))
            .signal(controller.signal)
            .text(),
      );
    });

    step("already aborted signal", async () => {
      const controller = new AbortController();
      controller.abort("Pre-aborted.");
      await assertRejects(
        () =>
          new RequestBuilder()
            .url(new URL("/text-file", serverUrl))
            .signal(controller.signal)
            .text(),
      );
    });

    step("signal with timeout", async () => {
      const controller = new AbortController();
      setTimeout(() => controller.abort("Cancelled."), 50);
      await assertRejects(
        () =>
          new RequestBuilder()
            .url(new URL("/sleep/10000", serverUrl))
            .timeout("5s")
            .signal(controller.signal)
            .text(),
      );
    });

    await Promise.all(steps);
  });
});

// helpers for the body-cancellation tests below.
//
// these construct a `RequestResponse` directly with a synthetic upstream body
// so we can observe whether `body.cancel()` is invoked when reading is
// interrupted — the previously-leaking path on CI. doing it this way avoids
// the timing race that made the original failure intermittent.
function makeAbortableBody(abortController: AbortController) {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      if (abortController.signal.aborted) {
        controller.error(abortController.signal.reason);
        return;
      }
      abortController.signal.addEventListener("abort", () => {
        controller.error(abortController.signal.reason);
      });
    },
  });
}

function trackBodyCancel(response: Response): { count: () => number } {
  const body = response.body!;
  let count = 0;
  const orig = body.cancel.bind(body);
  Object.defineProperty(body, "cancel", {
    value(reason?: unknown) {
      count++;
      return orig(reason);
    },
    configurable: true,
    writable: true,
  });
  return { count: () => count };
}

function makeRequestResponse(opts: {
  response: Response;
  abortController: AbortController;
  onProgress?: (() => void)[];
}) {
  return new RequestResponse({
    response: opts.response,
    originalUrl: "http://localhost/test",
    progressBar: undefined,
    // any non-empty array forces the showProgress/onProgress wrapper path
    onProgress: (opts.onProgress ?? [() => {}]) as any,
    contentLength: undefined,
    abortController: {
      controller: opts.abortController,
      clearTimeout() {},
    },
  });
}

Deno.test("RequestResponse - cancels body when read method (no wrapper) throws", async () => {
  // when there's no progress wrapper, `text()`/`json()`/etc. read directly
  // from the original response. an abort during that read leaves the body
  // errored — we still need to call `cancel()` so the fetch resource is
  // released.
  const abortController = new AbortController();
  const response = new Response(makeAbortableBody(abortController), { status: 200 });
  const tracker = trackBodyCancel(response);
  // pass an empty onProgress array to bypass the wrapper path
  const requestResponse = makeRequestResponse({
    response,
    abortController,
    onProgress: [],
  });

  const textPromise = requestResponse.text();
  await Promise.resolve();
  abortController.abort(new Error("aborted in body"));
  await assertRejects(() => textPromise);
  assert(tracker.count() > 0, `expected response body.cancel() to be called on read error, got ${tracker.count()}`);
});

Deno.test("RequestResponse - progress wrapper cancels upstream body when read errors", async () => {
  const abortController = new AbortController();
  const response = new Response(makeAbortableBody(abortController), { status: 200 });
  const tracker = trackBodyCancel(response);
  const requestResponse = makeRequestResponse({ response, abortController });

  const textPromise = requestResponse.text();
  // let the wrapper start reading before we abort
  await Promise.resolve();
  abortController.abort(new Error("aborted in body"));
  await assertRejects(() => textPromise);
  assert(tracker.count() > 0, `expected upstream body.cancel() to be called, got ${tracker.count()}`);
});

Deno.test("RequestResponse - progress wrapper cancels upstream body when downstream cancels", async () => {
  const abortController = new AbortController();
  // body whose read never resolves until cancelled — mirrors a server that
  // returns headers but never sends body bytes.
  const sourceBody = new ReadableStream<Uint8Array>({
    pull() {
      return new Promise(() => {});
    },
  });
  const response = new Response(sourceBody, { status: 200 });
  const tracker = trackBodyCancel(response);
  const requestResponse = makeRequestResponse({ response, abortController });

  const reader = requestResponse.readable.getReader();
  // start the read so the wrapper attaches to the upstream body
  const readPromise = reader.read();
  await Promise.resolve();
  await reader.cancel("downstream-cancel");
  // the read should resolve as cancelled rather than hang
  await readPromise.catch(() => {});
  assert(tracker.count() > 0, `expected upstream body.cancel() to be called on cancel, got ${tracker.count()}`);
});

Deno.test("RequestBuilder[symbols.readable] - cancels response body when pull errors", async () => {
  const { symbols } = await import("@david/shell/internal");

  // stand up a fake fetch by stubbing the global. we can't easily get a real
  // fetch to time out without flakiness, so swap in a controlled response.
  const abortController = new AbortController();
  const response = new Response(makeAbortableBody(abortController), { status: 200 });
  const tracker = trackBodyCancel(response);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = ((_url: any, init?: RequestInit) => {
    init?.signal?.addEventListener("abort", () => abortController.abort(init.signal!.reason), { once: true });
    return Promise.resolve(response);
  }) as typeof fetch;

  try {
    const builder = new RequestBuilder().url("http://localhost/test");
    const stream: ReadableStream<Uint8Array> = (builder as any)[symbols.readable]();
    const reader = stream.getReader();
    const readPromise = reader.read();
    await Promise.resolve();
    abortController.abort(new Error("aborted in pull"));
    await readPromise.catch(() => {});
    assert(tracker.count() > 0, `expected response body.cancel() to be called, got ${tracker.count()}`);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
