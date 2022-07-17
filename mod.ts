import { CommandBuilder, CommandResult, escapeArg } from "./src/command.ts";
import { Delay, DelayIterator, delayToIterator, delayToMs, formatMillis } from "./src/common.ts";
import { colors, fs, path, which, whichSync } from "./src/deps.ts";
import { RequestBuilder } from "./src/request.ts";

export { CommandBuilder, CommandResult } from "./src/command.ts";
export { RequestBuilder, RequestResult } from "./src/request.ts";

/**
 * Cross platform shell tools for Deno inspired by [zx](https://github.com/google/zx).
 *
 * Differences:
 *
 * 1. No globals or global configuration.
 * 1. No custom CLI.
 * 1. Cross platform shell to help the code work on Windows.
 *    - Uses [deno_task_shell](https://github.com/denoland/deno_task_shell)'s parser.
 *    - Allows exporting the shell's environment to the current process.
 * 1. Good for application code in addition to use as a shell script replacement
 * 1. Named after my cat.
 *
 * ## Example
 *
 * ```ts
 * import $ from "https://deno.land/x/dax@VERSION_GOES_HERE/mod.ts";
 *
 * await $`echo hello`;
 * ```
 *
 * @module
 */

/** Options for using `$.retry({ ... })` */
export interface RetryOptions<TReturn> {
  /** Number of times to retry. */
  count: number;
  /** Delay in milliseconds. */
  delay: Delay | DelayIterator;
  /** Action to retry if it throws. */
  action: () => Promise<TReturn>;
  /** Do not log. */
  quiet?: boolean;
}

export interface $Type {
  (strings: TemplateStringsArray, ...exprs: any[]): CommandBuilder;
  /**
   * Makes a request to the provided URL throwing by default if the
   * response is not successful.
   *
   * ```ts
   * const data = await $.request("https://plugins.dprint.dev/info.json")
   *  .json();
   * ```
   *
   * @see {@link RequestBuilder}
   */
  request(url: string | URL): RequestBuilder;
  /** Changes the directory of the current process. */
  cd(path: string | URL): void;
  /**
   * Escapes an argument for the shell when not using the template
   * literal.
   *
   * This is done by default in the template literal, so you most likely
   * don't need this, but it may be useful when using the command builder.
   *
   * For example:
   *
   * ```ts
   * const builder = new CommandBuilder()
   *  .command(`echo ${$.escapeArg("some text with spaces")}`);
   *
   * // equivalent to this:
   * const builder = new CommandBuilder()
   *  .command(`echo 'some text with spaces'`);
   *
   * // you may just want to do this though:
   * const builder = new CommandBuilder()
   *  .command(["echo", "some text with spaces"]);
   * ```
   */
  escapeArg(arg: string): string;
  /**
   * Gets if the provided path exists asynchronously.
   *
   * Although there is a potential for a race condition between the
   * time this check is made and the time some code is used, it may
   * not be a big deal to use this in some scenarios and simplify
   * the code a lot.
   */
  exists(path: string): Promise<boolean>;
  /** Gets if the provided path exists synchronously. */
  existsSync(path: string): boolean;
  /** Re-export of deno_std's `fs` module. */
  fs: typeof fs;
  /** Re-export of deno_std's `path` module. */
  path: typeof path;
  /**
   * Logs with potential indentation (`$.logIndent`)
   * and output of commands or request responses.
   *
   * Note: Everything is logged over stderr.
   */
  log(...data: any[]): void;
  /**
   * Similar to `$.log`, but logs out the text lighter than usual. This
   * might be useful for logging out something that's unimportant.
   */
  logLight(...data: any[]): void;
  /**
   * Similar to `$.log`, but will bold red the first word if one argument or
   * first argument if multiple arguments.
   */
  logStep(firstArg: string, ...data: any[]): void;
  /**
   * Similar to `$.logStep`, but will use bold red.
   */
  logError(firstArg: string, ...data: any[]): void;
  /**
   * Similar to `$.logStep`, but will use bold yellow.
   */
  logWarn(firstArg: string, ...data: any[]): void;
  /**
   * Causes all `$.log` and like functions to be logged with indentation.
   *
   * ```ts
   * await $.logIndent(async () => {
   * $.log("This will be indented.");
   *   await $.logIndent(async () => {
   *     $.log("This will indented even more.");
   *   });
   * });
   * ```
   */
  logIndent<TResult>(action: () => TResult): TResult;
  /**
   * Sleep for the provided delay.
   *
   * ```ts
   * await $.sleep(1000); // ms
   * await $.sleep("1.5s");
   * await $.sleep("100ms");
   * ```
   */
  sleep(delay: Delay): Promise<void>;
  /**
   * Does the provided action until it succeeds (does not throw)
   * or the specified number of retries (`count`) is hit.
   */
  withRetries<TReturn>(params: RetryOptions<TReturn>): Promise<TReturn>;
  /** Re-export of `deno_which` for getting the path to an executable. */
  which: typeof which;
  /** Similar to `which`, but synchronously. */
  whichSync: typeof whichSync;
}

function sleep(delay: Delay) {
  const ms = delayToMs(delay);
  return new Promise<void>(resolve => setTimeout(resolve, ms));
}

async function withRetries<TReturn>(opts: RetryOptions<TReturn>) {
  const delayIterator = delayToIterator(opts.delay);
  for (let i = 0; i < opts.count; i++) {
    if (i > 0) {
      const nextDelay = delayIterator.next();
      if (!opts.quiet) {
        $.logWarn(`Failed trying again in ${formatMillis(nextDelay)}...`);
      }
      await sleep(nextDelay);
      if (!opts.quiet) {
        $.logStep(`Retrying attempt ${i + 1}/${opts.count}...`);
      }
    }
    try {
      return await opts.action();
    } catch (err) {
      // don't bother with indentation here
      console.error(err);
    }
  }

  throw new Error(`Failed after ${opts.count} attempts.`);
}

function cd(path: string | URL) {
  Deno.chdir(path);
}

// this is global because it then allows functions to easily call
// other functions and those should be indented underneath
let indentLevel = 0;

function getLogText(data: any[]) {
  // this should be smarter to better emulate how console.log/error work
  const combinedText = data.join(" ");
  if (indentLevel === 0) {
    return combinedText;
  } else {
    const indentText = "  ".repeat(indentLevel);
    return combinedText
      .split(/\n/) // keep \r on line
      .map(l => `${indentText}${l}`)
      .join("\n");
  }
}

function logStep(firstArg: string, data: any[], colourize: (text: string) => string) {
  if (data.length === 0) {
    let i = 0;
    // skip over any leading whitespace
    while (i < firstArg.length && firstArg[i] === " ") {
      i++;
    }
    // skip over any non whitespace
    while (i < firstArg.length && firstArg[i] !== " ") {
      i++;
    }
    // emphasize the first word only
    firstArg = colourize(firstArg.substring(0, i)) + firstArg.substring(i);
  } else {
    firstArg = colourize(firstArg);
  }
  console.error(getLogText([firstArg, ...data]));
}

const helperObject = {
  fs,
  path,
  cd,
  escapeArg,
  existsSync(path: string) {
    return fs.existsSync(path);
  },
  exists(path: string) {
    return fs.exists(path);
  },
  log(...data: any[]) {
    // all logging is done over stderr
    console.error(getLogText(data));
  },
  logLight(...data: any[]) {
    console.error(colors.gray(getLogText(data)));
  },
  logStep(firstArg: string, ...data: any[]) {
    logStep(firstArg, data, (t) => colors.bold(colors.green(t)));
  },
  logError(firstArg: string, ...data: any[]) {
    logStep(firstArg, data, (t) => colors.bold(colors.red(t)));
  },
  logWarn(firstArg: string, ...data: any[]) {
    logStep(firstArg, data, (t) => colors.bold(colors.yellow(t)));
  },
  logIndent<TResult>(action: () => TResult): TResult {
    indentLevel++;
    let wasPromise = false;
    try {
      const result = action();
      if (result instanceof Promise) {
        wasPromise = true;
        return result.finally(() => {
          indentLevel--;
        }) as any;
      } else {
        return result;
      }
    } finally {
      if (!wasPromise) {
        indentLevel--;
      }
    }
  },
  sleep,
  withRetries,
  which(commandName: string) {
    if (commandName.toUpperCase() === "DENO") {
      return Promise.resolve(Deno.execPath());
    } else {
      return which(commandName);
    }
  },
  whichSync(commandName: string) {
    if (commandName.toUpperCase() === "DENO") {
      return Deno.execPath();
    } else {
      return whichSync(commandName);
    }
  },
};

/** Options for creating a custom `$`. */
export interface Create$Options {
  /** Uses the state of this command builder as a starting point. */
  commandBuilder?: CommandBuilder;
  /** Uses the state of this request builder as a starting point. */
  requestBuilder?: RequestBuilder;
}

/**
 * Builds a new `$` which will use the state of the provided
 * builders as the default.
 *
 * This can be useful if you want different default settings.
 *
 * Example:
 *
 * ```ts
 * import { build$ } from "https://deno.land/x/dax/mod.ts";
 *
 * const commandBuilder = new CommandBuilder()
 *   .cwd("./subDir")
 *   .env("HTTPS_PROXY", "some_value");
 * const requestBuilder = new RequestBuilder()
 *   .header("SOME_VALUE", "value");
 *
 * const $ = build$({ commandBuilder, requestBuilder });
 *
 * // this command will use the env described above, but the main
 * // process and default `$` won't have its environment changed
 * await $`deno run my_script.ts`;
 *
 * // similarly, this will have the headers that were set in the request builder
 * const data = await $.request("https://plugins.dprint.dev/info.json").json();
 * ```
 */
export function build$(options: Create$Options) {
  const commandBuilder = options.commandBuilder ?? new CommandBuilder();
  const requestBuilder = options.requestBuilder ?? new RequestBuilder();
  return Object.assign(
    (strings: TemplateStringsArray, ...exprs: any[]) => {
      let result = "";
      for (let i = 0; i < Math.max(strings.length, exprs.length); i++) {
        if (strings.length > i) {
          result += strings[i];
        }
        if (exprs.length > i) {
          const expr = exprs[i];
          if (expr instanceof CommandResult) {
            // remove last newline
            result += escapeArg(expr.stdout.replace(/\r?\n$/, ""));
          } else {
            result += escapeArg(`${exprs[i]}`);
          }
        }
      }
      return commandBuilder.command(result);
    },
    helperObject,
    {
      request(url: string | URL) {
        return requestBuilder.url(url);
      },
    },
  );
}

/**
 * Default `$` where commands may be executed.
 */
export const $: $Type = build$({});
export default $;
