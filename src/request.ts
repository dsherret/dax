import { Path } from "@david/path";
import { type Delay, delayToMs, type WriteFileOptions } from "@david/shell";
import { symbols } from "@david/shell/internal";
import { filterEmptyRecordValues, formatMillis, getFileNameFromUrl, TimeoutError } from "./common.ts";
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
  onProgress: ((event: ProgressEvent) => void)[];
  timeout: number | undefined;
  signal: AbortSignal | undefined;
  beforeRequest: BeforeRequestCallback[] | undefined;
}

/** Callback invoked before a request is sent.
 *
 * Receives the current builder and may return a (possibly modified) builder
 * to use for the request. Returning the builder unchanged — or returning
 * nothing — is a no-op.
 *
 * The builder passed to the callback is wrapped in a Proxy that hides its
 * `.then`, so it isn't detected as a thenable by the JavaScript Promise
 * machinery. That makes it safe to `return builder.header(...)` from an
 * `async` function without the runtime recursively unwrapping the thenable
 * and triggering a fetch. Methods like `.header(...)` that return a new
 * builder return another such wrapped Proxy.
 *
 * The return type is loose because TypeScript infers the async return type
 * by following `PromiseLike` (the same logic the runtime uses), so e.g.
 * `async b => b.header(...)` is inferred as `Promise<RequestResponse>`.
 */
export type BeforeRequestCallback = (
  builder: RequestBuilder,
) =>
  | RequestBuilder
  | Promise<RequestBuilder>
  | Promise<RequestResponse>
  | void
  | Promise<void>;

/** Event passed to an `onProgress` callback as bytes are received. */
export interface ProgressEvent {
  /** Cumulative number of bytes received so far. */
  loaded: number;
  /** Total number of bytes expected from the `content-length` header,
   * or `undefined` if not provided by the server.
   */
  total: number | undefined;
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
      onProgress: [...state.onProgress],
      timeout: state.timeout,
      signal: state.signal,
      beforeRequest: state.beforeRequest,
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
      onProgress: [],
      timeout: undefined,
      signal: undefined,
      beforeRequest: undefined,
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
          await readable.cancel(cancelledReason);
        } else {
          streamReader = readable.getReader();
        }
      },
      async pull(controller) {
        try {
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
        } catch (err) {
          // make sure the underlying response body is released so we don't leak it
          try {
            streamReader?.releaseLock();
          } catch {
            // ignore
          }
          try {
            await response?.cancelBody();
          } catch {
            // ignore
          }
          throw err;
        }
      },
      async cancel(reason?: any) {
        wasCancelled = true;
        cancelledReason = reason;
        try {
          if (streamReader != null) {
            await streamReader.cancel(reason);
          }
        } catch {
          // ignore
        }
        try {
          await response?.cancelBody();
        } catch {
          // ignore
        }
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
    return this.#resolveStateForRequest().then(makeRequest).catch((err) => {
      if (err instanceof TimeoutError) {
        Error.captureStackTrace(err, TimeoutError);
      }
      return Promise.reject(err);
    });
  }

  async #resolveStateForRequest(): Promise<RequestBuilderState> {
    const callbacks = this.#state?.beforeRequest;
    if (callbacks == null || callbacks.length === 0) {
      return this.#getClonedState();
    }
    // strip the hooks before running them so the builder passed to each
    // callback can't accidentally recurse by appending to its own beforeRequest list
    let builder: RequestBuilder = this.#newWithState((state) => {
      state.beforeRequest = undefined;
    });
    for (const cb of callbacks) {
      // wrap in a non-thenable Proxy so `return builder.header(...)` from an
      // async callback isn't unwrapped (and re-fetched) by Promise machinery
      const proxy = wrapNonThenable(builder);
      const result = (await (cb(proxy) as any)) as unknown;
      builder = unwrapBuilder(result) ?? builder;
    }
    return builder.#getClonedState();
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

  /** Adds a callback that is invoked as bytes are received from the response body.
   *
   * The callback fires once per chunk read from the network with the cumulative
   * number of bytes received and the total expected size (from the `content-length`
   * header, or `undefined` if the server didn't provide one). Multiple callbacks
   * may be registered by calling this method repeatedly; each is invoked in the
   * order it was added.
   */
  onProgress(callback: (event: ProgressEvent) => void): RequestBuilder {
    return this.#newWithState((state) => {
      state.onProgress.push(callback);
    });
  }

  /** Timeout the request after the specified delay throwing a `TimeoutError`. */
  timeout(delay: Delay | undefined): RequestBuilder {
    return this.#newWithState((state) => {
      state.timeout = delay == null ? undefined : delayToMs(delay);
    });
  }

  /** Sets an abort signal for the request. When the signal is
   * aborted, the request will be cancelled.
   */
  signal(signal: AbortSignal): RequestBuilder {
    return this.#newWithState((state) => {
      state.signal = signal;
    });
  }

  /** Registers a callback that runs just before each request is sent.
   *
   * The callback receives the current builder and may return a (possibly
   * modified) builder to use for the request. Useful for asynchronously
   * resolving values such as auth tokens.
   *
   * ```ts
   * $.request(url).beforeRequest(async (builder) => {
   *   return builder.header("Authorization", `Bearer ${await getAccessToken()}`);
   * });
   * ```
   *
   * Multiple `.beforeRequest(...)` calls compose: each registered callback runs
   * in the order it was added, with the builder produced by the previous one.
   *
   * The builder passed to the callback is in a special "passthrough" mode so
   * its `.then(...)` resolves with the builder itself (instead of fetching) —
   * this is what makes `return builder.header(...)` from an `async` function
   * safe. If you construct a fresh `new RequestBuilder()` inside the callback,
   * return it as `{ requestBuilder: ... }` to avoid accidental fetching.
   */
  beforeRequest(callback: BeforeRequestCallback): RequestBuilder {
    return this.#newWithState((state) => {
      state.beforeRequest = state.beforeRequest == null ? [callback] : [...state.beforeRequest, callback];
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
  async pipeToPath(options?: WriteFileOptions): Promise<Path>;
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
    options?: WriteFileOptions,
  ): Promise<Path>;
  async pipeToPath(
    filePathOrOptions?: string | URL | Path | WriteFileOptions,
    maybeOptions?: WriteFileOptions,
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
    onProgress: ((event: ProgressEvent) => void)[];
    contentLength: number | undefined;
    abortController: RequestAbortController;
  }) {
    this.#originalUrl = opts.originalUrl;
    this.#response = opts.response;
    this.#abortController = opts.abortController;
    if (opts.response.body == null) {
      opts.abortController.clearTimeout();
    }

    if (opts.progressBar != null || opts.onProgress.length > 0) {
      const pb = opts.progressBar;
      const onProgress = opts.onProgress;
      const total = opts.contentLength;
      this.#downloadResponse = new Response(
        new ReadableStream({
          async start(controller) {
            const reader = opts.response.body?.getReader();
            if (reader == null) {
              return;
            }
            let loaded = 0;
            let lockReleased = false;
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done || value == null) {
                  break;
                }
                loaded += value.byteLength;
                pb?.increment(value.byteLength);
                if (onProgress.length > 0) {
                  const event = { loaded, total };
                  for (const callback of onProgress) {
                    callback(event);
                  }
                }
                controller.enqueue(value);
              }
              const signal = opts.abortController.controller.signal;
              if (signal.aborted) {
                controller.error(signal.reason);
              } else {
                controller.close();
              }
            } catch (err) {
              // release the lock then cancel the upstream body so we don't leak it
              try {
                reader.releaseLock();
                lockReleased = true;
              } catch {
                // ignore
              }
              try {
                await opts.response.body?.cancel(err);
              } catch {
                // ignore
              }
              throw err;
            } finally {
              if (!lockReleased) {
                try {
                  reader.releaseLock();
                } catch {
                  // ignore
                }
              }
              pb?.finish();
            }
          },
          async cancel(reason) {
            // propagate cancellation to the upstream response body
            try {
              await opts.response.body?.cancel(reason);
            } catch {
              // ignore
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
   *
   * Note: this does not consume the body. If you don't intend to read the
   * body, call `cancelBody()` first to release the underlying resources.
   */
  throwIfNotOk(): void {
    if (!this.ok) {
      throw new Error(`Error making request to ${this.#originalUrl}: ${this.statusText}`);
    }
  }

  /**
   * Cancels the response body, releasing the underlying resources.
   *
   * Useful in conjunction with `.noThrow()` and `throwIfNotOk()` when you
   * don't intend to read the body.
   */
  cancelBody(): Promise<void> {
    return this.#withReturnHandling(async () => {
      await this.#response.body?.cancel();
    });
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
  async pipeToPath(options?: WriteFileOptions): Promise<Path>;
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
    options?: WriteFileOptions,
  ): Promise<Path>;
  async pipeToPath(
    filePathOrOptions?: string | URL | Path | WriteFileOptions,
    maybeOptions?: WriteFileOptions,
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
  const abortController = getAbortController();
  let response: Response;
  try {
    response = await fetch(state.url, {
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
  } catch (err) {
    abortController.clearTimeout();
    throw err;
  }
  const contentLength = getContentLength();
  const result = new RequestResponse({
    response,
    originalUrl: state.url.toString(),
    progressBar: getProgressBar(contentLength),
    onProgress: state.onProgress,
    contentLength,
    abortController,
  });
  const shouldThrowOnError = !response.ok && (
    !state.noThrow
    || (state.noThrow instanceof Array && !state.noThrow.includes(response.status))
  );
  if (shouldThrowOnError) {
    // await the cancel so the body resource is fully consumed before throwing,
    // so that we don't leak resources
    try {
      await result.cancelBody();
    } catch {
      // ignore
    }
    result.throwIfNotOk();
  }
  return result;

  function getProgressBar(contentLength: number | undefined) {
    if (state.progressOptions == null || state.progressBarFactory == null) {
      return undefined;
    }
    return state.progressBarFactory(`Download ${state.url}`)
      .noClear(state.progressOptions.noClear)
      .kind("bytes")
      .length(contentLength);
  }

  function getContentLength() {
    const contentLength = response.headers.get("content-length");
    if (contentLength == null) {
      return undefined;
    }
    const length = parseInt(contentLength, 10);
    return isNaN(length) ? undefined : length;
  }

  function getAbortController(): RequestAbortController {
    const baseController = getTimeoutAbortController() ?? {
      controller: new AbortController(),
      clearTimeout() {
        // do nothing
      },
    };

    if (state.signal == null) {
      return baseController;
    }

    if (state.signal.aborted) {
      baseController.controller.abort(state.signal.reason);
      return baseController;
    }

    const onAbort = () => {
      baseController.controller.abort(state.signal!.reason);
    };
    state.signal.addEventListener("abort", onAbort, { once: true });

    const originalClearTimeout = baseController.clearTimeout;
    return {
      controller: baseController.controller,
      clearTimeout() {
        originalClearTimeout();
        state.signal?.removeEventListener("abort", onAbort);
      },
    };
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

// maps a non-thenable Proxy back to the real RequestBuilder it wraps
const proxyToBuilder = new WeakMap<RequestBuilder, RequestBuilder>();

/** Wraps a `RequestBuilder` in a Proxy that hides `.then`, so it isn't detected
 * as a thenable by Promise machinery. Methods that return another
 * `RequestBuilder` (e.g. `.header(...)`) return a similarly wrapped Proxy, so
 * chaining inside a `beforeRequest` callback stays "non-thenable" all the way
 * through. Methods called on the proxy run with `this === target`, so private
 * fields keep working. */
function wrapNonThenable(builder: RequestBuilder): RequestBuilder {
  const proxy = new Proxy(builder, {
    get(target, prop, _receiver) {
      // hide `.then` so Promise.resolve / await don't see a thenable here
      if (prop === "then") return undefined;
      const value = Reflect.get(target, prop, target);
      if (typeof value === "function") {
        return (...args: unknown[]) => {
          const result = (value as (...a: unknown[]) => unknown).apply(target, args);
          if (result instanceof RequestBuilder) {
            return wrapNonThenable(result);
          }
          return result;
        };
      }
      return value;
    },
  }) as RequestBuilder;
  proxyToBuilder.set(proxy, builder);
  return proxy;
}

function unwrapBuilder(result: unknown): RequestBuilder | undefined {
  if (!(result instanceof RequestBuilder)) return undefined;
  return proxyToBuilder.get(result) ?? result;
}

function resolvePipeToPathParams(
  pathOrOptions: string | URL | Path | WriteFileOptions | undefined,
  maybeOptions: WriteFileOptions | undefined,
  originalUrl: string | URL | undefined,
) {
  let filePath: Path | undefined;
  let options: WriteFileOptions | undefined;
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
