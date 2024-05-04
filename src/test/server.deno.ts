import type { Server, StartServerHandler } from "./server.common.ts";

export const startServer: StartServerHandler = (options) => {
  return new Promise<Server>((resolve, _reject) => {
    const server = Deno.serve({
      hostname: "localhost",
      onListen(details) {
        const url = new URL(`http://localhost:${details.port}/`);
        resolve({
          rootUrl: url,
          shutdown: () => server.shutdown(),
        });
      },
    }, (request) => {
      return options.handle(request);
    });
  });
};
