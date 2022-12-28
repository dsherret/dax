import { CommandBuilder, CommandResult, escapeArg } from "./src/command.ts";
import {
  Box,
  Delay,
  DelayIterator,
  delayToIterator,
  delayToMs,
  formatMillis,
  LoggerTreeBox,
  TreeBox,
} from "./src/common.ts";
import {
  confirm,
  ConfirmOptions,
  maybeConfirm,
  maybeMultiSelect,
  maybePrompt,
  maybeSelect,
  multiSelect,
  MultiSelectOptions,
  ProgressBar,
  ProgressOptions,
  prompt,
  PromptOptions,
  select,
  SelectOptions,
} from "./src/console/mod.ts";
import { colors, fs, path, which, whichSync } from "./src/deps.ts";
import { RequestBuilder } from "./src/request.ts";

export { CommandBuilder, CommandResult } from "./src/command.ts";
export type { CommandContext, CommandHandler, CommandPipeReader, CommandPipeWriter } from "./src/command_handler.ts";
export type {
  ConfirmOptions,
  MultiSelectOption,
  MultiSelectOptions,
  ProgressBar,
  ProgressOptions,
  PromptOptions,
  SelectOptions,
} from "./src/console/mod.ts";
export { RequestBuilder, RequestResult } from "./src/request.ts";
// these are used when registering commands
export type {
  CdChange,
  ContinueExecuteResult,
  EnvChange,
  ExecuteResult,
  ExitExecuteResult,
  SetEnvVarChange,
  SetShellVarChange,
} from "./src/result.ts";

/**
 * Cross platform shell tools for Deno inspired by [zx](https://github.com/google/zx).
 *
 * Differences:
 *
 * 1. Minimal globals or global configuration.
 *    - Only a default instance of `$`, but it's not mandatory to use this.
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

/** Type of `$` instances. */
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
  /**
   * Builds a new `$` which will use the state of the provided
   * builders as the default and inherits settings from the `$` the
   * new `$` was built from.
   *
   * This can be useful if you want different default settings or want
   * to change loggers for only a subset of code.
   *
   * Example:
   *
   * ```ts
   * import dax from "https://deno.land/x/dax/mod.ts";
   *
   * const commandBuilder = new CommandBuilder()
   *   .cwd("./subDir")
   *   .env("HTTPS_PROXY", "some_value");
   * const requestBuilder = new RequestBuilder()
   *   .header("SOME_VALUE", "value");
   *
   * const $ = dax.build$({ commandBuilder, requestBuilder });
   *
   * // this command will use the env described above, but the main
   * // process and default `$` won't have its environment changed
   * await $`deno run my_script.ts`;
   *
   * // similarly, this will have the headers that were set in the request builder
   * const data = await $.request("https://plugins.dprint.dev/info.json").json();
   * ```
   */
  build$(options?: Create$Options): $Type;
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
   * Similar to `$.log`, but will bold green the first word if one argument or
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
   * $.logGroup(() => {
   *   $.log("This will be indented.");
   *   $.logGroup(() => {
   *     $.log("This will indented even more.");
   *   });
   * });
   *
   * const result = await $.logGroup(async () => {
   *   $.log("This will be indented.");
   *   const value = await someAsyncWork();
   *   return value * 5;
   * });
   * ```
   * @param action - Action to run and potentially get the result for.
   */
  logGroup<TResult>(action: () => TResult): TResult;
  /**
   * Causes all `$.log` and like functions to be logged with indentation and a label.
   *
   * ```ts
   * $.logGroup("Some label", () => {
   *   $.log("This will be indented.");
   * });
   * ```
   * @param label Title message to log for this level.
   * @param action Action to run and potentially get the result for.
   */
  logGroup<TResult>(label: string, action: () => TResult): TResult;
  /**
   * Causes all `$.log` and like functions to be logged with indentation.
   *
   * ```ts
   * $.logGroup();
   * $.log("This will be indented.");
   * $.logGroup("Level 2");
   * $.log("This will be indented even more.");
   * $.logGroupEnd();
   * $.logGroupEnd();
   * ```
   *
   * Note: You must call `$.logGroupEnd()` when using this.
   *
   * It is recommended to use `$.logGroup(() => { ... })` over this one
   * as it will internally call `$.logGroupEnd()` even when exceptions
   * are thrown.
   *
   * @param label Optional title message to log for this level.
   */
  logGroup(label?: string): void;
  /**
   * Ends a logging level.
   *
   * Meant to be used with `$.logGroup();` when not providing a function..
   */
  logGroupEnd(): void;
  /** Gets or sets the current log depth (0-indexed). */
  logDepth: number;
  /**
   * Shows a prompt asking the user to answer a yes or no question.
   *
   * @returns `true` or `false` if the user made a selection or `undefined` if the user pressed ctrl+c.
   */
  maybeConfirm(message: string): Promise<boolean | undefined>;
  /**
   * Shows a prompt asking the user to answer a yes or no question.
   *
   * @returns `true` or `false` if the user made a selection or `undefined` if the user pressed ctrl+c.
   */
  maybeConfirm(options: ConfirmOptions): Promise<boolean | undefined>;
  /**
   * Shows a prompt asking the user to answer a yes or no question.
   *
   * @returns `true` or `false` if the user made a selection or exits the process if the user pressed ctrl+c.
   */
  confirm(message: string): Promise<boolean>;
  /**
   * Shows a prompt asking the user to answer a yes or no question.
   *
   * @returns `true` or `false` if the user made a selection or exits the process if the user pressed ctrl+c.
   */
  confirm(options: ConfirmOptions): Promise<boolean>;
  /**
   * Shows a prompt selection to the user where there is one possible answer.
   *
   * @returns Option index the user selected or `undefined` if the user pressed ctrl+c.
   */
  maybeSelect(options: SelectOptions): Promise<number | undefined>;
  /**
   * Shows a prompt selection to the user where there is one possible answer.
   *
   * @returns Option index the user selected or exits the process if the user pressed ctrl+c.
   */
  select(options: SelectOptions): Promise<number>;
  /**
   * Shows a prompt selection to the user where there are multiple or zero possible answers.
   *
   * @returns Array of selected indexes or `undefined` if the user pressed ctrl+c.
   */
  maybeMultiSelect(options: MultiSelectOptions): Promise<number[] | undefined>;
  /**
   * Shows a prompt selection to the user where there are multiple or zero possible answers.
   *
   * @returns Array of selected indexes or exits the process if the user pressed ctrl+c.
   */
  multiSelect(options: MultiSelectOptions): Promise<number[]>;
  /**
   * Shows an input prompt where the user can enter any text.
   *
   * @param message Message to show.
   * @returns The inputted text or `undefined` if the user pressed ctrl+c.
   */
  maybePrompt(message: string): Promise<string | undefined>;
  /**
   * Shows an input prompt where the user can enter any text.
   *
   * @param options Options for the prompt.
   * @returns The inputted text or `undefined` if the user pressed ctrl+c.
   */
  maybePrompt(options: PromptOptions): Promise<string | undefined>;
  /**
   * Shows an input prompt where the user can enter any text.
   *
   * @param message Message to show.
   * @returns The inputted text or exits the process if the user pressed ctrl+c.
   */
  prompt(message: string): Promise<string>;
  /**
   * Shows an input prompt where the user can enter any text.
   *
   * @param options Options for the prompt.
   * @returns The inputted text or exits the process if the user pressed ctrl+c.
   */
  prompt(options: PromptOptions): Promise<string>;
  /** Shows a progress message when indeterminate or bar when determinate. */
  progress(message: string): ProgressBar;
  /** Shows a progress message when indeterminate or bar when determinate. */
  progress(options: ProgressOptions): ProgressBar;
  /**
   * Sets the logger used for info logging.
   * @default console.error
   */
  setInfoLogger(logger: (args: any[]) => void): void;
  /**
   * Sets the logger used for warn logging.
   * @default console.error
   */
  setWarnLogger(logger: (args: any[]) => void): void;
  /**
   * Sets the logger used for error logging.
   * @default console.error
   */
  setErrorLogger(logger: (args: any[]) => void): void;
  /**
   * Mutates the internal command builder to print the command text by
   * default before executing commands instead of needing to build a
   * custom `$`.
   *
   * For example:
   *
   * ```ts
   * $.setPrintCommand(true);
   * const text = "example";
   * await $`echo ${text}`;
   * ```
   *
   * Outputs:
   *
   * ```
   * > echo example
   * example
   * ```
   *
   * @param value - Whether this should be enabled or disabled.
   */
  setPrintCommand(value: boolean): void;
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
   * Executes the command as raw text without escaping expressions.
   *
   * ```ts
   * const expr = "some   text   to   echo";
   * $.raw`echo {expr}`; // outputs: some text to echo
   * ```
   *
   * @remarks Most likely you will want to escape arguments or provide
   * an array of arguments to the main `$` tagged template. For example:
   *
   * ```ts
   * const exprs = ["arg1", "arg two", "arg three"];
   * await $`command ${exprs}`;
   * ```
   */
  raw(strings: TemplateStringsArray, ...exprs: any[]): CommandBuilder;
  /**
   * Does the provided action until it succeeds (does not throw)
   * or the specified number of retries (`count`) is hit.
   */
  withRetries<TReturn>(opts: RetryOptions<TReturn>): Promise<TReturn>;
  /** Re-export of `deno_which` for getting the path to an executable. */
  which: typeof which;
  /** Similar to `which`, but synchronously. */
  whichSync: typeof whichSync;
}

function sleep(delay: Delay) {
  const ms = delayToMs(delay);
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function withRetries<TReturn>(
  $local: $Type,
  errorLogger: (...args: any[]) => void,
  opts: RetryOptions<TReturn>,
) {
  const delayIterator = delayToIterator(opts.delay);
  for (let i = 0; i < opts.count; i++) {
    if (i > 0) {
      const nextDelay = delayIterator.next();
      if (!opts.quiet) {
        $local.logWarn(`Failed. Trying again in ${formatMillis(nextDelay)}...`);
      }
      await sleep(nextDelay);
      if (!opts.quiet) {
        $local.logStep(`Retrying attempt ${i + 1}/${opts.count}...`);
      }
    }
    try {
      return await opts.action();
    } catch (err) {
      // don't bother with indentation here
      errorLogger(err);
    }
  }

  throw new Error(`Failed after ${opts.count} attempts.`);
}

function cd(path: string | URL) {
  Deno.chdir(path);
}

interface $State {
  commandBuilder: TreeBox<CommandBuilder>;
  requestBuilder: RequestBuilder;
  infoLogger: LoggerTreeBox;
  warnLogger: LoggerTreeBox;
  errorLogger: LoggerTreeBox;
  indentLevel: Box<number>;
}

function buildInitial$State(opts: Create$Options & { isGlobal: boolean }): $State {
  return {
    commandBuilder: new TreeBox(opts.commandBuilder ?? new CommandBuilder()),
    requestBuilder: opts.requestBuilder ?? new RequestBuilder(),
    infoLogger: new LoggerTreeBox(console.error),
    warnLogger: new LoggerTreeBox(console.error),
    errorLogger: new LoggerTreeBox(console.error),
    indentLevel: new Box(0),
  };
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
  sleep,
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

function build$FromState(state: $State) {
  const logDepthObj = {
    get logDepth() {
      return state.indentLevel.value;
    },
    set logDepth(value: number) {
      if (value < 0 || value % 1 !== 0) {
        throw new Error("Expected a positive integer.");
      }
      state.indentLevel.value = value;
    },
  };
  const result = Object.assign(
    (strings: TemplateStringsArray, ...exprs: any[]) => {
      let result = "";
      for (let i = 0; i < Math.max(strings.length, exprs.length); i++) {
        if (strings.length > i) {
          result += strings[i];
        }
        if (exprs.length > i) {
          result += templateLiteralExprToString(exprs[i], escapeArg);
        }
      }
      return state.commandBuilder.getValue().command(result);
    },
    helperObject,
    logDepthObj,
    {
      build$(opts: Create$Options = {}) {
        return build$FromState({
          commandBuilder: opts.commandBuilder != null
            ? new TreeBox(opts.commandBuilder)
            : state.commandBuilder.createChild(),
          requestBuilder: opts.requestBuilder ?? state.requestBuilder,
          errorLogger: state.errorLogger.createChild(),
          infoLogger: state.infoLogger.createChild(),
          warnLogger: state.warnLogger.createChild(),
          indentLevel: state.indentLevel,
        });
      },
      log(...data: any[]) {
        state.infoLogger.getValue()(getLogText(data));
      },
      logLight(...data: any[]) {
        state.infoLogger.getValue()(colors.gray(getLogText(data)));
      },
      logStep(firstArg: string, ...data: any[]) {
        logStep(firstArg, data, (t) => colors.bold(colors.green(t)), state.infoLogger.getValue());
      },
      logError(firstArg: string, ...data: any[]) {
        logStep(firstArg, data, (t) => colors.bold(colors.red(t)), state.errorLogger.getValue());
      },
      logWarn(firstArg: string, ...data: any[]) {
        logStep(firstArg, data, (t) => colors.bold(colors.yellow(t)), state.warnLogger.getValue());
      },
      logGroup<TResult>(labelOrAction?: string | (() => TResult), maybeAction?: () => TResult): TResult | void {
        const label = typeof labelOrAction === "string" ? labelOrAction : undefined;
        if (label) {
          state.infoLogger.getValue()(getLogText([label]));
        }
        state.indentLevel.value++;
        const action = label != null ? maybeAction : labelOrAction as (() => TResult);
        if (action != null) {
          let wasPromise = false;
          try {
            const result = action();
            if (result instanceof Promise) {
              wasPromise = true;
              return result.finally(() => {
                if (state.indentLevel.value > 0) {
                  state.indentLevel.value--;
                }
              }) as any;
            } else {
              return result;
            }
          } finally {
            if (!wasPromise) {
              if (state.indentLevel.value > 0) {
                state.indentLevel.value--;
              }
            }
          }
        }
      },
      logGroupEnd() {
        if (state.indentLevel.value > 0) {
          state.indentLevel.value--;
        }
      },
      maybeConfirm,
      confirm,
      maybeSelect,
      select,
      maybeMultiSelect,
      multiSelect,
      maybePrompt,
      prompt,
      progress(messageOrText: ProgressOptions | string) {
        const options: ProgressOptions = typeof messageOrText === "string"
          ? (() => {
            const words = messageOrText.split(" ");
            return {
              prefix: words[0],
              message: words.length > 1 ? words.slice(1).join(" ") : undefined,
            };
          })()
          : messageOrText;
        return new ProgressBar((...data) => {
          state.infoLogger.getValue()(...data);
        }, options);
      },
      setInfoLogger(logger: (args: any[]) => void) {
        state.infoLogger.setValue(logger);
      },
      setWarnLogger(logger: (args: any[]) => void) {
        state.warnLogger.setValue(logger);
      },
      setErrorLogger(logger: (args: any[]) => void) {
        state.errorLogger.setValue(logger);

        // also update the logger used for the print command
        const commandBuilder = state.commandBuilder.getValue();
        commandBuilder.setPrintCommandLogger(logger);
        state.commandBuilder.setValue(commandBuilder);
      },
      setPrintCommand(value: boolean) {
        const commandBuilder = state.commandBuilder.getValue().printCommand(value);
        state.commandBuilder.setValue(commandBuilder);
      },
      request(url: string | URL) {
        return state.requestBuilder.url(url);
      },
      raw(strings: TemplateStringsArray, ...exprs: any[]) {
        let result = "";
        for (let i = 0; i < Math.max(strings.length, exprs.length); i++) {
          if (strings.length > i) {
            result += strings[i];
          }
          if (exprs.length > i) {
            result += templateLiteralExprToString(exprs[i]);
          }
        }
        return state.commandBuilder.getValue().command(result);
      },
      withRetries<TReturn>(opts: RetryOptions<TReturn>): Promise<TReturn> {
        return withRetries(result, state.errorLogger.getValue(), opts);
      },
    },
  );
  // copy over the get/set accessors for logDepth
  const keyName: keyof typeof logDepthObj = "logDepth";
  Object.defineProperty(result, keyName, Object.getOwnPropertyDescriptor(logDepthObj, keyName)!);
  return result;

  function getLogText(data: any[]) {
    // this should be smarter to better emulate how console.log/error work
    const combinedText = data.join(" ");
    if (state.indentLevel.value === 0) {
      return combinedText;
    } else {
      const indentText = "  ".repeat(state.indentLevel.value);
      return combinedText
        .split(/\n/) // keep \r on line
        .map((l) => `${indentText}${l}`)
        .join("\n");
    }
  }

  function logStep(
    firstArg: string,
    data: any[],
    colourize: (text: string) => string,
    logger: (...args: any[]) => void,
  ) {
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
    logger(getLogText([firstArg, ...data]));
  }
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
export function build$(options: Create$Options = {}) {
  return build$FromState(buildInitial$State({
    isGlobal: false,
    ...options,
  }));
}

function templateLiteralExprToString(expr: any, escape?: (arg: string) => string): string {
  let result: string;
  if (expr instanceof Array) {
    return expr.map((e) => templateLiteralExprToString(e, escape)).join(" ");
  } else if (expr instanceof CommandResult) {
    // remove last newline
    result = expr.stdout.replace(/\r?\n$/, "");
  } else {
    result = `${expr}`;
  }
  return escape ? escape(result) : result;
}

/**
 * Default `$` instance where commands may be executed.
 */
export const $: $Type = build$FromState(buildInitial$State({
  isGlobal: true,
}));
export default $;
