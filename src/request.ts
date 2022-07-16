import { filterEmptyRecordValues } from "./common.ts";

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
  redirect: RequestRedirect | undefined;
  referrer: string | undefined;
  referrerPolicy: ReferrerPolicy | undefined;
  timeout: number | undefined;
}

/**
 * Builder API for downloading files.
 */
export class RequestBuilder implements PromiseLike<RequestResult> {
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

  then<TResult1 = RequestResult, TResult2 = never>(
    onfulfilled?: ((value: RequestResult) => TResult1 | PromiseLike<TResult1>) | null | undefined,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null | undefined,
  ): PromiseLike<TResult1 | TResult2> {
    return this.fetch().then(onfulfilled).catch(onrejected);
  }

  /** Fetches and gets the response. */
  fetch() {
    return makeRequest(this.#getClonedState());
  }

  /** Specifies the URL to send the request to. */
  url(value: string | URL | undefined) {
    return this.#newWithState(state => {
      state.url = value;
    });
  }

  /** Sets multiple headers at the same time via an object literal. */
  header(items: Record<string, string | undefined>): this;
  /** Sets a header to send with the request. */
  header(name: string, value: string | undefined): this;
  header(nameOrItems: string | Record<string, string | undefined>, value?: string) {
    return this.#newWithState(state => {
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
    return this.#newWithState(state => {
      if (typeof value === "boolean" || value == null) {
        state.noThrow = value ?? true;
      } else {
        state.noThrow = [value, ...additional];
      }
    });
  }

  body(value: BodyInit | undefined) {
    return this.#newWithState(state => {
      state.body = value;
    });
  }

  cache(value: RequestCache | undefined) {
    return this.#newWithState(state => {
      state.cache = value;
    });
  }

  integrity(value: string | undefined) {
    return this.#newWithState(state => {
      state.integrity = value;
    });
  }

  keepalive(value: boolean) {
    return this.#newWithState(state => {
      state.keepalive = value;
    });
  }

  method(value: string) {
    return this.#newWithState(state => {
      state.method = value;
    });
  }

  mode(value: RequestMode) {
    return this.#newWithState(state => {
      state.mode = value;
    });
  }

  redirect(value: RequestRedirect) {
    return this.#newWithState(state => {
      state.redirect = value;
    });
  }

  referrer(value: string | undefined) {
    return this.#newWithState(state => {
      state.referrer = value;
    });
  }

  referrerPolicy(value: ReferrerPolicy | undefined) {
    return this.#newWithState(state => {
      state.referrerPolicy = value;
    });
  }

  /** Timeout the request after the specified number of milliseconds */
  timeout(ms: number | undefined) {
    return this.#newWithState(state => {
      state.timeout = ms;
    });
  }

  /** Fetches and gets the response as an array buffer. */
  async arrayBuffer() {
    const response = await this.fetch();
    return response.arrayBuffer();
  }

  /** Fetches and gets the response as a blob. */
  async blob() {
    const response = await this.fetch();
    return response.blob();
  }

  /** Fetches and gets the response as JSON additionally setting
   * a JSON accept header if not set. */
  async json<TResult = any>(): Promise<TResult> {
    let builder = this;
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
  async text() {
    const response = await this.fetch();
    return response.text();
  }
}

/** Result of making a request. */
export class RequestResult {
  #response: Response;
  #originalUrl: string;

  constructor(
    response: Response,
    originalUrl: string,
  ) {
    this.#originalUrl = originalUrl;
    this.#response = response;
  }

  /** Raw response. */
  get response() {
    return this.#response;
  }

  /** Response headers. */
  get headers() {
    return this.#response.headers;
  }

  /** If the response had a 2xx code. */
  get ok() {
    return this.#response.ok;
  }

  /** If the response is the result of a redirect. */
  get redirected() {
    return this.#response.redirected;
  }

  /** Status code of the response. */
  get status() {
    return this.#response.status;
  }

  /** Status text of the response. */
  get statusText() {
    return this.#response.statusText;
  }

  /** URL of the response. */
  get url() {
    return this.#response.url;
  }

  /**
   * Throws if the response doesn't have a 2xx code.
   *
   * This might be useful if the request was build with `.noThrow()`, but
   * otherwise this is called automatically for any non-2xx response codes.
   */
  throwIfNotOk() {
    if (!this.ok) {
      throw new Error(`Error making request to ${this.#originalUrl}: ${this.statusText}`);
    }
  }

  /** Respose body as an array buffer. */
  arrayBuffer() {
    if (this.#response.status === 404) {
      return undefined as any;
    }
    return this.#response.arrayBuffer();
  }

  /** Response body as a blog. */
  blob() {
    if (this.#response.status === 404) {
      return undefined as any;
    }
    return this.#response.blob();
  }

  /** Respose body as JSON. */
  json<TResult = any>(): Promise<TResult> {
    if (this.#response.status === 404) {
      return undefined as any;
    }
    return this.#response.json();
  }

  /** Respose body as text. */
  text() {
    if (this.#response.status === 404) {
      return undefined;
    }
    return this.#response.text();
  }
}

export async function makeRequest(state: RequestBuilderState) {
  if (state.url == null) {
    throw new Error("You must specify a URL before fetching.");
  }
  const timeout = getTimeout();
  const response = await fetch(state.url, {
    body: state.body,
    cache: state.cache,
    headers: filterEmptyRecordValues(state.headers),
    integrity: state.integrity,
    keepalive: state.keepalive,
    method: state.method,
    mode: state.mode,
    redirect: state.redirect,
    referrer: state.referrer,
    referrerPolicy: state.referrerPolicy,
    signal: timeout?.signal,
  });
  timeout?.clear();
  const result = new RequestResult(response, state.url.toString());
  if (!state.noThrow) {
    result.throwIfNotOk();
  } else if (state.noThrow instanceof Array) {
    if (!state.noThrow.includes(response.status)) {
      result.throwIfNotOk();
    }
  }
  return result;

  function getTimeout() {
    if (state.timeout == null) {
      return undefined;
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), state.timeout);
    return {
      signal: controller.signal,
      clear() {
        clearTimeout(timeoutId);
      },
    };
  }
}
