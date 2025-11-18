import http from "node:http";
import type { Server, StartServerHandler } from "./server.common.ts";

export const startServer: StartServerHandler = (options) => {
  return new Promise<Server>((resolve, reject) => {
    const server = http.createServer(async (request, response) => {
      try {
        const webRequest = new Request(new URL(request.url!, `http://${request.headers.host!}`), {
          headers: new Headers(request.headers as any),
        });
        const handlerResponse = await options.handle(webRequest);
        response.writeHead(handlerResponse.status);
        response.flushHeaders();
        // todo: improve
        const body = await handlerResponse.arrayBuffer();
        response.end(new Uint8Array(body));
      } catch (error: any) {
        // deno-lint-ignore no-console
        console.error("Error", error);
        if (!response.headersSent) {
          response.writeHead(500, { "Content-Type": "text/plain" });
          response.end(new TextEncoder().encode(`Server error: ${error.message}`));
        }
        if (!response.writableEnded) {
          // forcefully close the connection
          response.socket?.destroy();
        }
        reject(error);
      }
    });

    server.listen(0, "localhost", () => {
      const address = server.address() as import("node:net").AddressInfo;
      const url = new URL(`http://localhost:${address.port}/`);
      // deno-lint-ignore no-console
      console.log(`\n\nServer listening at ${url}...\n`);
      resolve({
        rootUrl: url,
        shutdown() {
          return new Promise((resolve, reject) => {
            server.close((err) => {
              if (err) reject(err);
              else resolve();
            });
          });
        },
      });
    });
  });
};
