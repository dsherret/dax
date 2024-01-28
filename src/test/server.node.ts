import http from "node:http";
import { Server, StartServerHandler } from "./server.common.ts";

export const startServer: StartServerHandler = (options) => {
  return new Promise<Server>((resolve, reject) => {
    const server = http.createServer(async (request, response) => {
      try {
        const webRequest = new Request(new URL(request.url!));
        const handlerResponse = await options.handle(webRequest);
        response.writeHead(handlerResponse.status);
        // todo: improve
        const body = await handlerResponse.blob();
        response.end(body);
      } catch (error) {
        reject(error);
      }
    });

    server.listen(0, "localhost", () => {
      const address = server.address() as import("node:net").AddressInfo;
      const url = new URL(`http://localhost:${address.port}/`);
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
