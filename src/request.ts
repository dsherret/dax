import { Path } from "@david/path";
import { formatMillis, symbols } from "./common.ts";
import { TimeoutError } from "./common.ts";
import { type Delay, delayToMs, filterEmptyRecordValues, getFileNameFromUrl } from "./common.ts";
import type { ProgressBar } from "./console/mod.ts";

interface RequestBuilderState {
  noThrow: boolean | number[];
  url: string | URL | undefined;
  body: BodyInit | undefined;
  cache: RequestCache | undefined;
  headers: Record<string, string | undefined>;
  integrity: string | undefined;
  keepalive: boolean | undefined;
  method: string | undefined;
  mode: RequestMode | undefined;
  progressBarFactory: ((message: string) => ProgressBar) | undefined;
  redirect: RequestRedirect | undefined;
  referrer: string | undefined;
  referrerPolicy: ReferrerPolicy | undefined;
  progressOptions: { noClear: boolean } | undefined;
  timeout: number | undefined;
}

/** @internal */
export const withProgressBarFactorySymbol: unique symbol = Symbol();

/**
 * Builder API for downloading files.
 */
export class RequestBuilder implements PromiseLike<RequestResponse> {
  #state: Readonly<RequestBuilderState> | undefined = undefined;

  #getClonedState(): RequestBuilderState {
    const state = this.#state;
    if (state == null) {
      return this.#getDefaultState();
    }
    return {
      // be explicit here in order to force evaluation
      // of each property on a case by case basis
      noThrow: typeof state.noThrow === "boolean" ? state.noThrow : [...state.noThrow],
      url: state.url,
      body: state.body,
      cache: state.cache,
      headers: state.headers,
      integrity: state.integrity,
      keepalive: state.keepalive,
      method: state.method,
      mode: state.mode,
      redirect: state.redirect,
      referrer: state.referrer,
      referrerPolicy: state.referrerPolicy,
      progressBarFactory: state.progressBarFactory,
      progressOptions: state.progressOptions == null ? undefined : {
        ...state.progressOptions,
      },
      timeout: state.timeout,
    };
  }

  #getDefaultState(): RequestBuilderState {
    return {
      noThrow: false,
      url: undefined,
      body: undefined,
      cache: undefined,
      headers: {},
      integrity: undefined,
      keepalive: undefined,
      method: undefined,
      mode: undefined,
      redirect: undefined,
      referrer: undefined,
      referrerPolicy: undefined,
      progressBarFactory: undefined,
      progressOptions: undefined,
      timeout: undefined,
    };
  }

  #newWithState(action: (state: RequestBuilderState) => void): RequestBuilder {
    const builder = new RequestBuilder();
    const state = this.#getClonedState();
    action(state);
    builder.#state = state;
    return builder;
  }

  [symbols.readable](): ReadableStream<Uint8Array> {
    const self = this;
    let streamReader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    let response: RequestResponse | undefined;
    let wasCancelled = false;
    let cancelledReason: unknown;
    return new ReadableStream({
      async start() {
        response = await self.fetch();
        const readable = response.readable;
        if (wasCancelled) {
          readable.cancel(cancelledReason);
        } else {
          streamReader = readable.getReader();
        }
      },
      async pull(controller) {
        const { done, value } = await streamReader!.read();
        if (done || value == null) {
          if (response?.signal?.aborted) {
            controller.error(response?.signal?.reason);
          } else {
            controller.close();
          }
        } else {
          controller.enqueue(value);
        }
      },
      cancel(reason?: any) {
        streamReader?.cancel(reason);
        wasCancelled = true;
        cancelledReason = reason;
      },
    });
  }

  then<TResult1 = RequestResponse, TResult2 = never>(
    onfulfilled?: ((value: RequestResponse) => TResult1 | PromiseLike<TResult1>) | null | undefined,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null | undefined,
  ): PromiseLike<TResult1 | TResult2> {
    return this.fetch().then(onfulfilled).catch(onrejected);
  }

  /** Fetches and gets the response. */
  fetch(): Promise<RequestResponse> {
    return makeRequest(this.#getClonedState()).catch((err) => {
      if (err instanceof TimeoutError) {
        Error.captureStackTrace(err, TimeoutError);
      }
      return Promise.reject(err);
    });
  }

  /** Specifies the URL to send the request to. */
  url(value: string | URL | undefined): RequestBuilder {
    return this.#newWithState((state) => {
      state.url = value;
    });
  }

  /** Sets multiple headers at the same time via an object literal. */
  header(items: Record<string, string | undefined>): RequestBuilder;
  /** Sets a header to send with the request. */
  header(name: string, value: string | undefined): RequestBuilder;
  header(nameOrItems: string | Record<string, string | undefined>, value?: string) {
    return this.#newWithState((state) => {
      if (typeof nameOrItems === "string") {
        setHeader(state, nameOrItems, value);
      } else {
        for (const [name, value] of Object.entries(nameOrItems)) {
          setHeader(state, name, value);
        }
      }
    });

    function setHeader(state: RequestBuilderState, name: string, value: string | undefined) {
      name = name.toUpperCase(); // case insensitive
      state.headers[name] = value;
    }
  }

  /**
   * Do not throw if a non-2xx status code is received.
   *
   * By default the request builder will throw when
   * receiving a non-2xx status code. Specify this
   * to have it not throw.
   */
  noThrow(value?: boolean): RequestBuilder;
  /**
   * Do not throw if a non-2xx status code is received
   * except for these excluded provided status codes.
   *
   * This overload may be especially useful when wanting to ignore
   * 404 status codes and have it return undefined instead. For example:
   *
   * ```ts
   * const data = await $.request(`https://crates.io/api/v1/crates/${crateName}`)
   *   .noThrow(404)
   *   .json<CratesIoMetadata | undefined>();
   * ```
   *
   * Note, use multiple arguments to ignore multiple status codes (ex. `.noThrow(400, 404)`) as
   * multiple calls to `.noThrow()` will overwrite the previous.
   */
  noThrow(exclusionStatusCode: number, ...additional: number[]): RequestBuilder;
  noThrow(value?: boolean | number, ...additional: number[]) {
    return this.#newWithState((state) => {
      if (typeof value === "boolean" || value == null) {
        state.noThrow = value ?? true;
      } else {
        state.noThrow = [value, ...additional];
      }
    });
  }

  body(value: BodyInit | undefined): RequestBuilder {
    return this.#newWithState((state) => {
      state.body = value;
    });
  }

  cache(value: RequestCache | undefined): RequestBuilder {
    return this.#newWithState((state) => {
      state.cache = value;
    });
  }

  integrity(value: string | undefined): RequestBuilder {
    return this.#newWithState((state) => {
      state.integrity = value;
    });
  }

  keepalive(value: boolean): RequestBuilder {
    return this.#newWithState((state) => {
      state.keepalive = value;
    });
  }

  method(value: string): RequestBuilder {
    return this.#newWithState((state) => {
      state.method = value;
    });
  }

  mode(value: RequestMode): RequestBuilder {
    return this.#newWithState((state) => {
      state.mode = value;
    });
  }

  /** @internal */
  [withProgressBarFactorySymbol](factory: (message: string) => ProgressBar): RequestBuilder {
    return this.#newWithState((state) => {
      state.progressBarFactory = factory;
    });
  }

  redirect(value: RequestRedirect): RequestBuilder {
    return this.#newWithState((state) => {
      state.redirect = value;
    });
  }

  referrer(value: string | undefined): RequestBuilder {
    return this.#newWithState((state) => {
      state.referrer = value;
    });
  }

  referrerPolicy(value: ReferrerPolicy | undefined): RequestBuilder {
    return this.#newWithState((state) => {
      state.referrerPolicy = value;
    });
  }

  /** Shows a progress bar while downloading with the provided options. */
  showProgress(opts: { noClear?: boolean }): RequestBuilder;
  /** Shows a progress bar while downloading. */
  showProgress(show?: boolean): RequestBuilder;
  showProgress(value?: { noClear?: boolean } | boolean) {
    return this.#newWithState((state) => {
      if (value === true || value == null) {
        state.progressOptions = { noClear: false };
      } else if (value === false) {
        state.progressOptions = undefined;
      } else {
        state.progressOptions = {
          noClear: value.noClear ?? false,
        };
      }
    });
  }

  /** Timeout the request after the specified delay throwing a `TimeoutError`. */
  timeout(delay: Delay | undefined): RequestBuilder {
    return this.#newWithState((state) => {
      state.timeout = delay == null ? undefined : delayToMs(delay);
    });
  }

  /** Fetches and gets the response as an array buffer. */
  async arrayBuffer(): Promise<ArrayBuffer> {
    const response = await this.fetch();
    return response.arrayBuffer();
  }

  /** Fetches and gets the response as a blob. */
  async blob(): Promise<Blob> {
    const response = await this.fetch();
    return response.blob();
  }

  /** Fetches and gets the response as form data. */
  async formData(): Promise<FormData> {
    const response = await this.fetch();
    return response.formData();
  }

  /** Fetches and gets the response as JSON additionally setting
   * a JSON accept header if not set. */
  async json<TResult = any>(): Promise<TResult> {
    let builder: RequestBuilder = this;
    const acceptHeaderName = "ACCEPT";
    if (
      builder.#state == null
      || !Object.hasOwn(builder.#state.headers, acceptHeaderName)
    ) {
      builder = builder.header(acceptHeaderName, "application/json");
    }
    const response = await builder.fetch();
    return response.json<TResult>();
  }

  /** Fetches and gets the response as text. */
  async text(): Promise<string> {
    const response = await this.fetch();
    return response.text();
  }

  /** Pipes the response body to the provided writable stream. */
  async pipeTo(dest: WritableStream<Uint8Array>, options?: StreamPipeOptions): Promise<void> {
    const response = await this.fetch();
    return await response.pipeTo(dest, options);
  }

  /**
   * Pipes the response body to a file.
   *
   * @remarks The path will be derived from the request's url
   * and downloaded to the current working directory.
   *
   * @returns The path reference of the downloaded file.
   */
  async pipeToPath(options?: Deno.WriteFileOptions): Promise<Path>;
  /**
   * Pipes the response body to a file.
   *
   * @remarks If no path is provided then it will be derived from the
   * request's url and downloaded to the current working directory.
   *
   * @returns The path reference of the downloaded file.
   */
  async pipeToPath(
    path?: string | URL | Path | undefined,
    options?: Deno.WriteFileOptions,
  ): Promise<Path>;
  async pipeToPath(
    filePathOrOptions?: string | URL | Path | Deno.WriteFileOptions,
    maybeOptions?: Deno.WriteFileOptions,
  ) {
    // Do not derive from the response url because that could cause the server
    // to be able to overwrite whatever file it wants locally, which would be
    // a security issue.
    // Additionally, resolve the path immediately in case the user changes their cwd
    // while the response is being fetched.
    const { filePath, options } = resolvePipeToPathParams(filePathOrOptions, maybeOptions, this.#state?.url);
    const response = await this.fetch();
    return await response.pipeToPath(filePath, options);
  }

  /** Pipes the response body through the provided transform. */
  async pipeThrough<T>(transform: {
    writable: WritableStream<Uint8Array>;
    readable: ReadableStream<T>;
  }): Promise<ReadableStream<T>> {
    const response = await this.fetch();
    return response.pipeThrough(transform);
  }
}

interface RequestAbortController {
  controller: AbortController;
  /** Clears the timeout that may be set if there's a delay */
  clearTimeout(): void;
}

/** Response of making a request where the body can be read. */
export class RequestResponse {
  #response: Response;
  #downloadResponse: Response;
  #originalUrl: string;
  #abortController: RequestAbortController;

  /** @internal */
  constructor(opts: {
    response: Response;
    originalUrl: string;
    progressBar: ProgressBar | undefined;
    abortController: RequestAbortController;
  }) {
    this.#originalUrl = opts.originalUrl;
    this.#response = opts.response;
    this.#abortController = opts.abortController;
    if (opts.response.body == null) {
      opts.abortController.clearTimeout();
    }

    if (opts.progressBar != null) {
      const pb = opts.progressBar;
      this.#downloadResponse = new Response(
        new ReadableStream({
          async start(controller) {
            const reader = opts.response.body?.getReader();
            if (reader == null) {
              return;
            }
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done || value == null) {
                  break;
                }
                pb.increment(value.byteLength);
                controller.enqueue(value);
              }
              const signal = opts.abortController.controller.signal;
              if (signal.aborted) {
                controller.error(signal.reason);
              } else {
                controller.close();
              }
            } finally {
              reader.releaseLock();
              pb.finish();
            }
          },
        }),
      );
    } else {
      this.#downloadResponse = opts.response;
    }
  }

  /** Raw response. */
  get response(): Response {
    return this.#response;
  }

  /** Response headers. */
  get headers(): Headers {
    return this.#response.headers;
  }

  /** If the response had a 2xx code. */
  get ok(): boolean {
    return this.#response.ok;
  }

  /** If the response is the result of a redirect. */
  get redirected(): boolean {
    return this.#response.redirected;
  }

  /** The underlying `AbortSignal` used to abort the request body
   * when a timeout is reached or when the `.abort()` method is called. */
  get signal(): AbortSignal {
    return this.#abortController.controller.signal;
  }

  /** Status code of the response. */
  get status(): number {
    return this.#response.status;
  }

  /** Status text of the response. */
  get statusText(): string {
    return this.#response.statusText;
  }

  /** URL of the response. */
  get url(): string {
    return this.#response.url;
  }

  /** Aborts  */
  abort(reason?: unknown) {
    this.#abortController?.controller.abort(reason);
  }

  /**
   * Throws if the response doesn't have a 2xx code.
   *
   * This might be useful if the request was built with `.noThrow()`, but
   * otherwise this is called automatically for any non-2xx response codes.
   */
  throwIfNotOk(): void {
    if (!this.ok) {
      this.#response.body?.cancel().catch(() => {
        // ignore
      });
      throw new Error(`Error making request to ${this.#originalUrl}: ${this.statusText}`);
    }
  }

  /**
   * Respose body as an array buffer.
   *
   * Note: Returns `undefined` when `.noThrow(404)` and status code is 404.
   */
  arrayBuffer(): Promise<ArrayBuffer> {
    return this.#withReturnHandling(async () => {
      if (this.#response.status === 404) {
        await this.#response.body?.cancel();
        return undefined!;
      }
      return this.#downloadResponse.arrayBuffer();
    });
  }

  /**
   * Response body as a blog.
   *
   * Note: Returns `undefined` when `.noThrow(404)` and status code is 404.
   */
  blob(): Promise<Blob> {
    return this.#withReturnHandling(async () => {
      if (this.#response.status === 404) {
        await this.#response.body?.cancel();
        return undefined!;
      }
      return await this.#downloadResponse.blob();
    });
  }

  /**
   * Response body as a form data.
   *
   * Note: Returns `undefined` when `.noThrow(404)` and status code is 404.
   */
  formData(): Promise<FormData> {
    return this.#withReturnHandling(async () => {
      if (this.#response.status === 404) {
        await this.#response.body?.cancel();
        return undefined!;
      }
      return await this.#downloadResponse.formData();
    });
  }

  /**
   * Respose body as JSON.
   *
   * Note: Returns `undefined` when `.noThrow(404)` and status code is 404.
   */
  json<TResult = any>(): Promise<TResult> {
    return this.#withReturnHandling(async () => {
      if (this.#response.status === 404) {
        await this.#response.body?.cancel();
        return undefined as any;
      }
      return (await this.#downloadResponse.json()) as TResult;
    });
  }

  /**
   * Respose body as text.
   *
   * Note: Returns `undefined` when `.noThrow(404)` and status code is 404.
   */
  text(): Promise<string> {
    return this.#withReturnHandling(async () => {
      if (this.#response.status === 404) {
        // most people don't need to bother with this and if they do, they will
        // need to opt-in with `noThrow()`. So just assert non-nullable
        // to make it easier to work with and highlight this behaviour in the jsdocs.
        await this.#response.body?.cancel();
        return undefined!;
      }
      return await this.#downloadResponse.text();
    });
  }

  /** Pipes the response body to the provided writable stream. */
  pipeTo(dest: WritableStream<Uint8Array>, options?: StreamPipeOptions): Promise<void> {
    return this.#withReturnHandling(() => this.readable.pipeTo(dest, options));
  }

  /**
   * Pipes the response body to a file.
   *
   * @remarks The path will be derived from the request's url
   * and downloaded to the current working directory.
   *
   * @remarks  If the path is a directory, then the file name will be derived
   * from the request's url and the file will be downloaded to the provided directory
   *
   * @returns The path reference of the downloaded file
   */
  async pipeToPath(options?: Deno.WriteFileOptions): Promise<Path>;
  /**
   * Pipes the response body to a file.
   *
   * @remarks If no path is provided then it will be derived from the
   * request's url and downloaded to the current working directory.
   *
   * @remarks  If the path is a directory, then the file name will be derived
   * from the request's url and the file will be downloaded to the provided directory
   *
   * @returns The path reference of the downloaded file
   */
  async pipeToPath(
    path?: string | URL | Path | undefined,
    options?: Deno.WriteFileOptions,
  ): Promise<Path>;
  async pipeToPath(
    filePathOrOptions?: string | URL | Path | Deno.WriteFileOptions,
    maybeOptions?: Deno.WriteFileOptions,
  ) {
    // resolve the file path using the original url because it would be a security issue
    // to allow the server to select which file path to save the file to if using the
    // response url
    const { filePath, options } = resolvePipeToPathParams(filePathOrOptions, maybeOptions, this.#originalUrl);
    const body = this.readable;
    try {
      const file = await filePath.open({
        write: true,
        create: true,
        truncate: true,
        ...(options ?? {}),
      });
      try {
        await body.pipeTo(file.writable, {
          preventClose: true,
        });
        // Need to do this for node.js for some reason
        // in order to fully flush to the file. Maybe
        // it's a bug in node_shims
        await file.writable.close();
      } finally {
        try {
          file.close();
        } catch {
          // do nothing
        }
        this.#abortController?.clearTimeout();
      }
    } catch (err) {
      await this.#response.body?.cancel();
      throw err;
    }

    return filePath;
  }

  /** Pipes the response body through the provided transform. */
  pipeThrough<T>(transform: {
    writable: WritableStream<Uint8Array>;
    readable: ReadableStream<T>;
  }): ReadableStream<T> {
    return this.readable.pipeThrough(transform);
  }

  get readable(): ReadableStream<Uint8Array> {
    const body = this.#downloadResponse.body;
    if (body == null) {
      throw new Error("Response had no body.");
    }
    return body;
  }

  async #withReturnHandling<T>(action: () => Promise<T>): Promise<T> {
    try {
      return await action();
    } catch (err) {
      if (err instanceof TimeoutError) {
        // give the timeout error a better stack trace because
        // otherwise it will have the stack where it was aborted
        // which isn't very useful
        Error.captureStackTrace(err);
      }
      throw err;
    } finally {
      this.#abortController.clearTimeout();
    }
  }
}

export async function makeRequest(state: RequestBuilderState) {
  if (state.url == null) {
    throw new Error("You must specify a URL before fetching.");
  }
  const abortController = getTimeoutAbortController() ?? {
    controller: new AbortController(),
    clearTimeout() {
      // do nothing
    },
  };
  const response = await fetch(state.url, {
    body: state.body,
    // @ts-ignore not supported in Node.js yet?
    cache: state.cache,
    headers: filterEmptyRecordValues(state.headers),
    integrity: state.integrity,
    keepalive: state.keepalive,
    method: state.method,
    mode: state.mode,
    redirect: state.redirect,
    referrer: state.referrer,
    referrerPolicy: state.referrerPolicy,
    signal: abortController.controller.signal,
  });
  const result = new RequestResponse({
    response,
    originalUrl: state.url.toString(),
    progressBar: getProgressBar(),
    abortController,
  });
  if (!state.noThrow) {
    result.throwIfNotOk();
  } else if (state.noThrow instanceof Array) {
    if (!state.noThrow.includes(response.status)) {
      result.throwIfNotOk();
    }
  }
  return result;

  function getProgressBar() {
    if (state.progressOptions == null || state.progressBarFactory == null) {
      return undefined;
    }
    return state.progressBarFactory(`Download ${state.url}`)
      .noClear(state.progressOptions.noClear)
      .kind("bytes")
      .length(getContentLength());

    function getContentLength() {
      const contentLength = response.headers.get("content-length");
      if (contentLength == null) {
        return undefined;
      }
      const length = parseInt(contentLength, 10);
      return isNaN(length) ? undefined : length;
    }
  }

  function getTimeoutAbortController(): RequestAbortController | undefined {
    if (state.timeout == null) {
      return undefined;
    }
    const timeout = state.timeout;
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(new TimeoutError(`Request timed out after ${formatMillis(timeout)}.`)),
      timeout,
    );
    return {
      controller,
      clearTimeout() {
        clearTimeout(timeoutId);
      },
    };
  }
}

function resolvePipeToPathParams(
  pathOrOptions: string | URL | Path | Deno.WriteFileOptions | undefined,
  maybeOptions: Deno.WriteFileOptions | undefined,
  originalUrl: string | URL | undefined,
) {
  let filePath: Path | undefined;
  let options: Deno.WriteFileOptions | undefined;
  if (typeof pathOrOptions === "string" || pathOrOptions instanceof URL) {
    filePath = new Path(pathOrOptions).resolve();
    options = maybeOptions;
  } else if (pathOrOptions instanceof Path) {
    filePath = pathOrOptions.resolve();
    options = maybeOptions;
  } else if (typeof pathOrOptions === "object") {
    options = pathOrOptions;
  } else if (pathOrOptions === undefined) {
    options = maybeOptions;
  }
  if (filePath === undefined) {
    filePath = new Path(getFileNameFromUrlOrThrow(originalUrl));
  } else if (filePath.isDirSync()) {
    filePath = filePath.join(getFileNameFromUrlOrThrow(originalUrl));
  }
  filePath = filePath.resolve();

  return {
    filePath,
    options,
  };

  function getFileNameFromUrlOrThrow(url: string | URL | undefined) {
    const fileName = url == null ? undefined : getFileNameFromUrl(url);
    if (fileName == null) {
      throw new Error(
        "Could not derive the path from the request URL. "
          + "Please explicitly provide a path.",
      );
    }
    return fileName;
  }
}
