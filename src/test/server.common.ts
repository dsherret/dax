export interface ServerOptions {
  handle(request: Request): Promise<Response> | Response;
}

export interface Server {
  rootUrl: URL;
  shutdown(): Promise<void>;
}

export type StartServerHandler = (options: ServerOptions) => Promise<Server>;
