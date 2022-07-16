import { filterEmptyRecordValues } from "./common.ts";

interface RequestBuilderState {
  noThrow: boolean;
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
  #state: RequestBuilderState | undefined = undefined;

  #getState() {
    if (this.#state == null) {
      this.#state = {
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
    return this.#state;
  }

  #getStateCloned(): RequestBuilderState {
    const state = this.#getState();
    return {
      // be explicit here in order to force evaluation
      // of each property on a case by case basis
      noThrow: state.noThrow,
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

  then<TResult1 = RequestResult, TResult2 = never>(
    onfulfilled?: ((value: RequestResult) => TResult1 | PromiseLike<TResult1>) | null | undefined,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null | undefined,
  ): PromiseLike<TResult1 | TResult2> {
    return this.fetch().then(onfulfilled).catch(onrejected);
  }

  /** Clone the request builder. */
  clone() {
    const builder = new RequestBuilder();
    if (this.#state != null) {
      builder.#state = this.#getStateCloned();
    }
    return builder;
  }

  /** Fetches and gets the response. */
  fetch() {
    return makeRequest(this.#getStateCloned());
  }

  /** Specifies the URL to send the request to. */
  url(value: string | URL | undefined) {
    this.#getState().url = value;
    return this;
  }

  /** Sets multiple headers at the same time via an object literal. */
  header(items: Record<string, string | undefined>): this;
  /** Sets a header to send with the request. */
  header(name: string, value: string | undefined): this;
  header(nameOrItems: string | Record<string, string | undefined>, value?: string) {
    if (typeof nameOrItems === "string") {
      this.#setHeader(nameOrItems, value);
    } else {
      for (const [name, value] of Object.entries(nameOrItems)) {
        this.#setHeader(name, value);
      }
    }
    return this;
  }

  #setHeader(name: string, value: string | undefined) {
    name = name.toUpperCase(); // case insensitive
    this.#getState().headers[name] = value;
  }

  /**
   * Do not throw if a non-2xx status code is received.
   *
   * By default the request builder will throw when
   * receiving a non-2xx status code. Specify this
   * to have it not throw.
   */
  noThrow(value = true) {
    this.#getState().noThrow = value;
    return this;
  }

  body(value: BodyInit | undefined) {
    this.#getState().body = value;
    return this;
  }

  cache(value: RequestCache | undefined) {
    this.#getState().cache = value;
    return this;
  }

  integrity(value: string | undefined) {
    this.#getState().integrity = value;
    return this;
  }

  keepalive(value: boolean) {
    this.#getState().keepalive = value;
    return this;
  }

  method(value: string) {
    this.#getState().method = value;
    return this;
  }

  mode(value: RequestMode) {
    this.#getState().mode = value;
    return this;
  }

  redirect(value: RequestRedirect) {
    this.#getState().redirect = value;
    return this;
  }

  referrer(value: string | undefined) {
    this.#getState().referrer = value;
    return this;
  }

  referrerPolicy(value: ReferrerPolicy | undefined) {
    this.#getState().referrerPolicy = value;
    return this;
  }

  /** Timeout the request after the specified number of milliseconds */
  timeout(ms: number | undefined) {
    this.#getState().timeout = ms;
    return this;
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
  async json() {
    let builder = this;
    if (!Object.hasOwn(builder.#getState().headers, "ACCEPT")) {
      builder = builder.header("ACCEPT", "application/json");
    }
    const response = await builder.fetch();
    return response.json();
  }

  /** Fetches and gets the response as text. */
  async text() {
    const response = await this.fetch();
    return response.text();
  }
}

export class RequestResult {
  #response: Response;

  constructor(response: Response) {
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

  /** Respose body as an array buffer. */
  arrayBuffer() {
    return this.#response.arrayBuffer();
  }

  /** Response body as a blog. */
  blob() {
    return this.#response.blob();
  }

  /** Respose body as JSON. */
  json() {
    return this.#response.json();
  }

  /** Respose body as text. */
  text() {
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
  if (!response.ok && !state.noThrow) {
    throw new Error(`Error making request to ${state.url}: ${response.statusText}`);
  }
  return new RequestResult(response);

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
