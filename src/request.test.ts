import { serve } from "https://deno.land/std@0.167.0/http/server.ts";
import { Buffer } from "./deps.ts";
import { assertEquals, writableStreamFromWriter } from "./deps.test.ts";
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
      }
      return new Response("Not Found", { status: 404 });
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

Deno.test("pipeTo", () => {
  return withServer(async (serverUrl) => {
    const buffer = new Buffer();
    await new RequestBuilder()
      .url(new URL("/text-file", serverUrl))
      .showProgress()
      .pipeTo(writableStreamFromWriter(buffer));
    const text = new TextDecoder().decode(buffer.bytes());
    assertEquals(text, "text".repeat(1000));
  });
});

Deno.test("pipeThrough", () => {
  return withServer(async (serverUrl) => {
    const readable = await new RequestBuilder()
      .url(new URL("/text-file", serverUrl))
      .showProgress()
      .pipeThrough(new TextDecoderStream());
    const reader = readable.getReader();
    const result = await reader.read();
    assertEquals(result.value, "text".repeat(1000));
  });
});

Deno.test("pipeToPath", () => {
  return withServer(async (serverUrl) => {
    const testFilePath = Deno.makeTempFileSync();
    try {
      await new RequestBuilder()
        .url(new URL("/text-file", serverUrl))
        .showProgress()
        .pipeToPath(testFilePath);
      assertEquals(Deno.readTextFileSync(testFilePath), "text".repeat(1000));
    } finally {
      try {
        Deno.removeSync(testFilePath);
      } catch {
        // do nothing
      }
    }
  });
});
