import * as colors from "@std/fmt/colors";
import { which, whichSync } from "which";
import {
  CommandBuilder,
  escapeArg,
  getRegisteredCommandNamesSymbol,
  setCommandTextStateSymbol,
  template,
  templateRaw,
} from "./src/command.ts";
import type { TemplateExpr } from "./src/command.ts";
import {
  Box,
  type Delay,
  type DelayIterator,
  delayToIterator,
  delayToMs,
  formatMillis,
  LoggerTreeBox,
  symbols,
  TreeBox,
} from "./src/common.ts";
import {
  confirm,
  type ConfirmOptions,
  maybeConfirm,
  maybeMultiSelect,
  maybePrompt,
  maybeSelect,
  multiSelect,
  type MultiSelectOptions,
  ProgressBar,
  type ProgressOptions,
  prompt,
  type PromptOptions,
  select,
  type SelectOptions,
} from "./src/console/mod.ts";
import { wasmInstance } from "./src/lib/mod.ts";
import { createPath, Path } from "./src/path.ts";
import { RequestBuilder, withProgressBarFactorySymbol } from "./src/request.ts";
import { outdent } from "./src/vendor/outdent.ts";
import { denoWhichRealEnv } from "./src/shell.ts";

export type { Delay, DelayIterator } from "./src/common.ts";
export { TimeoutError } from "./src/common.ts";
export { FsFileWrapper, Path } from "./src/path.ts";
/** @deprecated Import `Path` instead. */
const PathRef = Path;
// bug in deno: https://github.com/denoland/deno_lint/pull/1262
export { PathRef };
export {
  CommandBuilder,
  CommandChild,
  CommandResult,
  KillSignal,
  KillSignalController,
  type KillSignalListener,
  type TemplateExpr,
} from "./src/command.ts";
export type { CommandContext, CommandHandler, CommandPipeReader, CommandPipeWriter } from "./src/command_handler.ts";
export type {
  ConfirmOptions,
  MultiSelectOption,
  MultiSelectOptions,
  ProgressBar,
  ProgressOptions,
  PromptInputMask,
  PromptOptions,
  SelectOptions,
} from "./src/console/mod.ts";
export type { ExpandGlobOptions, PathSymlinkOptions, SymlinkOptions, WalkEntry, WalkOptions } from "./src/path.ts";
export type { Closer, Reader, ShellPipeReaderKind, ShellPipeWriterKind, WriterSync } from "./src/pipes.ts";
export { RequestBuilder, RequestResponse } from "./src/request.ts";
// these are used when registering commands
export type {
  CdChange,
  ContinueExecuteResult,
  EnvChange,
  ExecuteResult,
  ExitExecuteResult,
  SetEnvVarChange,
  SetShellVarChange,
  UnsetVarChange,
} from "./src/result.ts";

/**
 * Cross platform shell tools for Deno inspired by [zx](https://github.com/google/zx).
 *
 * Differences:
 *
 * 1. Cross platform shell.
 *    - Makes more code work on Windows.
 *    - Allows exporting the shell's environment to the current process.
 *    - Uses [deno_task_shell](https://github.com/denoland/deno_task_shell)'s parser.
 *    - Has common commands built-in for better Windows support.
 * 1. Minimal globals or global configuration.
 *    - Only a default instance of `$`, but it's not mandatory to use this.
 * 1. No custom CLI.
 * 1. Good for application code in addition to use as a shell script replacement.
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
export type $Type<TExtras extends ExtrasObject = {}> =
  & $Template
  & (string extends keyof TExtras ? $BuiltInProperties<TExtras>
    : Omit<$BuiltInProperties<TExtras>, keyof TExtras>)
  & TExtras;

/** String literal template. */
export interface $Template {
  (strings: TemplateStringsArray, ...exprs: TemplateExpr[]): CommandBuilder;
}

/**
 * `outdent` from the https://deno.land/x/outdent module.
 * @internal
 */
type Outdent = typeof outdent;
/**
 * `which` from the https://deno.land/x/which module.
 * @internal
 */
type Which = typeof import("which").which;
/**
 * `whichSync` from the https://deno.land/x/which module.
 * @internal
 */
type WhichSync = typeof import("which").whichSync;

/** Collection of built-in properties that come with a `$`. */
export interface $BuiltInProperties<TExtras extends ExtrasObject = {}> {
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
   * import $ from "https://deno.land/x/dax/mod.ts";
   *
   * const commandBuilder = new CommandBuilder()
   *   .cwd("./subDir")
   *   .env("HTTPS_PROXY", "some_value");
   * const requestBuilder = new RequestBuilder()
   *   .header("SOME_VALUE", "value");
   *
   * const new$ = $.build$({
   *   commandBuilder,
   *   requestBuilder,
   *   // optional additional functions to add to `$`
   *   extras: {
   *     add(a: number, b: number) {
   *       return a + b;
   *     },
   *   },
   * });
   *
   * // this command will use the env described above, but the main
   * // process and default `$` won't have its environment changed
   * await new$`deno run my_script.ts`;
   *
   * // similarly, this will have the headers that were set in the request builder
   * const data = await new$.request("https://plugins.dprint.dev/info.json").json();
   *
   * // use the extra function we defined
   * console.log(new$.add(1, 2));
   * ```
   */
  build$<TNewExtras extends ExtrasObject = {}>(
    options?: Create$Options<TNewExtras>,
  ): $Type<Omit<TExtras, keyof TNewExtras> & TNewExtras>;
  /** Changes the directory of the current process. */
  cd(path: string | URL | ImportMeta | Path): void;
  /**
   * Escapes an argument for the shell when NOT using the template
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
  /** Strips ANSI escape codes from a string */
  stripAnsi(text: string): string;
  /**
   * De-indents (a.k.a. dedent/outdent) template literal strings
   *
   * Re-export of https://deno.land/x/outdent
   *
   * Removes the leading whitespace from each line,
   * allowing you to break the string into multiple
   * lines with indentation. If lines have an uneven
   * amount of indentation, then only the common
   * whitespace is removed.
   *
   * The opening and closing lines (which contain
   * the ` marks) must be on their own line. The
   * opening line must be empty, and the closing
   * line may contain whitespace. The opening and
   * closing line will be removed from the output,
   * so that only the content in between remains.
   */
  dedent: Outdent;
  /**
   * Determines if the provided command exists resolving to `true` if the command
   * will be resolved by the shell of the current `$` or false otherwise.
   */
  commandExists(commandName: string): Promise<boolean>;
  /**
   * Determines if the provided command exists resolving to `true` if the command
   * will be resolved by the shell of the current `$` or false otherwise.
   */
  commandExistsSync(commandName: string): boolean;
  /** Helper function for creating path references, which provide an easier way for
   * working with paths, directories, and files on the file system.
   *
   * The function creates a new `Path` from a path or URL string, file URL, or for the current module.
   */
  path: typeof createPath;
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
  maybeConfirm(message: string, options?: Omit<ConfirmOptions, "message">): Promise<boolean | undefined>;
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
  confirm(message: string, options?: Omit<ConfirmOptions, "message">): Promise<boolean>;
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
   * @param options Optional additional options.
   * @returns The inputted text or `undefined` if the user pressed ctrl+c.
   */
  maybePrompt(message: string, options?: Omit<PromptOptions, "message">): Promise<string | undefined>;
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
   * @param options Optional additional options.
   * @returns The inputted text or exits the process if the user pressed ctrl+c.
   */
  prompt(message: string, options?: Omit<PromptOptions, "message">): Promise<string>;
  /**
   * Shows an input prompt where the user can enter any text.
   *
   * @param options Options for the prompt.
   * @returns The inputted text or exits the process if the user pressed ctrl+c.
   */
  prompt(options: PromptOptions): Promise<string>;
  /** Shows a progress message when indeterminate or bar when determinate. */
  progress(message: string, options?: Omit<ProgressOptions, "message" | "prefix">): ProgressBar;
  /** Shows a progress message when indeterminate or bar when determinate. */
  progress(options: ProgressOptions): ProgressBar;
  /**
   * Sets the logger used for info logging.
   * @default console.error
   */
  setInfoLogger(logger: (...args: any[]) => void): void;
  /**
   * Sets the logger used for warn logging.
   * @default console.error
   */
  setWarnLogger(logger: (...args: any[]) => void): void;
  /**
   * Sets the logger used for error logging.
   * @default console.error
   */
  setErrorLogger(logger: (...args: any[]) => void): void;
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
  /** Symbols that can be attached to objects for better integration with Dax. */
  symbols: typeof symbols;
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
  raw(strings: TemplateStringsArray, ...exprs: TemplateExpr[]): CommandBuilder;
  /**
   * Does the provided action until it succeeds (does not throw)
   * or the specified number of retries (`count`) is hit.
   */
  withRetries<TReturn>(opts: RetryOptions<TReturn>): Promise<TReturn>;
  /** Re-export of `jsr:@david/which` for getting the path to an executable. */
  which: Which;
  /** Similar to `which`, but synchronously. */
  whichSync: WhichSync;
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

function cd(path: string | URL | ImportMeta | Path) {
  if (typeof path === "string" || path instanceof URL) {
    path = new Path(path);
  } else if (!(path instanceof Path)) {
    path = new Path(path satisfies ImportMeta).parentOrThrow();
  }
  Deno.chdir(path.toString());
}

/** @internal */
type ExtrasObject = Record<string, (...args: any[]) => unknown>;

interface $State<TExtras extends ExtrasObject> {
  commandBuilder: TreeBox<CommandBuilder>;
  requestBuilder: RequestBuilder;
  infoLogger: LoggerTreeBox;
  warnLogger: LoggerTreeBox;
  errorLogger: LoggerTreeBox;
  indentLevel: Box<number>;
  extras: TExtras | undefined;
}

function buildInitial$State<TExtras extends ExtrasObject>(
  opts: Create$Options<TExtras> & { isGlobal: boolean },
): $State<TExtras> {
  return {
    commandBuilder: new TreeBox(opts.commandBuilder ?? new CommandBuilder()),
    requestBuilder: opts.requestBuilder ?? new RequestBuilder(),
    // deno-lint-ignore no-console
    infoLogger: new LoggerTreeBox(console.error),
    // deno-lint-ignore no-console
    warnLogger: new LoggerTreeBox(console.error),
    // deno-lint-ignore no-console
    errorLogger: new LoggerTreeBox(console.error),
    indentLevel: new Box(0),
    extras: opts.extras,
  };
}

const helperObject = {
  path: createPath,
  cd,
  escapeArg,
  stripAnsi(text: string) {
    return wasmInstance.strip_ansi_codes(text);
  },
  dedent: outdent,
  sleep,
  which(commandName: string) {
    if (commandName.toUpperCase() === "DENO") {
      return Promise.resolve(Deno.execPath());
    } else {
      return which(commandName, denoWhichRealEnv);
    }
  },
  whichSync(commandName: string) {
    if (commandName.toUpperCase() === "DENO") {
      return Deno.execPath();
    } else {
      return whichSync(commandName, denoWhichRealEnv);
    }
  },
};

/** Options for creating a custom `$`. */
export interface Create$Options<TExtras extends ExtrasObject> {
  /** Uses the state of this command builder as a starting point. */
  commandBuilder?: CommandBuilder;
  /** Uses the state of this request builder as a starting point. */
  requestBuilder?: RequestBuilder;
  /** Extra properties to put on the `$`. */
  extras?: TExtras;
}

function build$FromState<TExtras extends ExtrasObject = {}>(state: $State<TExtras>): $Type<TExtras> {
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
    (strings: TemplateStringsArray, ...exprs: TemplateExpr[]) => {
      const textState = template(strings, exprs);
      return state.commandBuilder.getValue()[setCommandTextStateSymbol](textState);
    },
    helperObject,
    logDepthObj,
    {
      build$<TNewExtras extends ExtrasObject>(opts: Create$Options<TNewExtras> = {}) {
        return build$FromState({
          commandBuilder: opts.commandBuilder != null
            ? new TreeBox(opts.commandBuilder)
            : state.commandBuilder.createChild(),
          requestBuilder: opts.requestBuilder ?? state.requestBuilder,
          errorLogger: state.errorLogger.createChild(),
          infoLogger: state.infoLogger.createChild(),
          warnLogger: state.warnLogger.createChild(),
          indentLevel: state.indentLevel,
          extras: {
            ...state.extras,
            ...opts.extras,
          },
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
      commandExists(commandName: string) {
        if (state.commandBuilder.getValue()[getRegisteredCommandNamesSymbol]().includes(commandName)) {
          return Promise.resolve(true);
        }
        return helperObject.which(commandName).then((c) => c != null);
      },
      commandExistsSync(commandName: string) {
        if (state.commandBuilder.getValue()[getRegisteredCommandNamesSymbol]().includes(commandName)) {
          return true;
        }
        return helperObject.whichSync(commandName) != null;
      },
      maybeConfirm,
      confirm,
      maybeSelect,
      select,
      maybeMultiSelect,
      multiSelect,
      maybePrompt,
      prompt,
      progress(messageOrText: ProgressOptions | string, options?: Omit<ProgressOptions, "message" | "prefix">) {
        const opts: ProgressOptions = typeof messageOrText === "string"
          ? (() => {
            const words = messageOrText.split(" ");
            return {
              prefix: words[0],
              message: words.length > 1 ? words.slice(1).join(" ") : undefined,
              ...options,
            };
          })()
          : messageOrText;
        return new ProgressBar((...data) => {
          state.infoLogger.getValue()(...data);
        }, opts);
      },
      setInfoLogger(logger: (...args: any[]) => void) {
        state.infoLogger.setValue(logger);
      },
      setWarnLogger(logger: (...args: any[]) => void) {
        state.warnLogger.setValue(logger);
      },
      setErrorLogger(logger: (...args: any[]) => void) {
        state.errorLogger.setValue(logger);

        // also update the logger used for the print command
        const commandBuilder = state.commandBuilder.getValue();
        commandBuilder.setPrintCommandLogger(
          (cmd) => logger(colors.white(">"), colors.blue(cmd)),
        );
        state.commandBuilder.setValue(commandBuilder);
      },
      setPrintCommand(value: boolean) {
        const commandBuilder = state.commandBuilder.getValue().printCommand(value);
        state.commandBuilder.setValue(commandBuilder);
      },
      symbols,
      request(url: string | URL) {
        return state.requestBuilder.url(url);
      },
      raw(strings: TemplateStringsArray, ...exprs: any[]) {
        const textState = templateRaw(strings, exprs);
        return state.commandBuilder.getValue()[setCommandTextStateSymbol](textState);
      },
      withRetries<TReturn>(opts: RetryOptions<TReturn>): Promise<TReturn> {
        return withRetries(result, state.errorLogger.getValue(), opts);
      },
    },
    state.extras,
  );
  // copy over the get/set accessors for logDepth
  const keyName: keyof typeof logDepthObj = "logDepth";
  Object.defineProperty(result, keyName, Object.getOwnPropertyDescriptor(logDepthObj, keyName)!);
  state.requestBuilder = state.requestBuilder[withProgressBarFactorySymbol]((message) => result.progress(message));
  return result;

  function getLogText(data: any[]) {
    // this should be smarter to better emulate how console.log/error work
    const combinedText = data.map((d) => {
      const typeofD = typeof d;
      if (typeofD !== "object" && typeofD !== "undefined") {
        return d;
      } else {
        return Deno.inspect(d, { colors: true });
      }
    }).join(" ");
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
 * const $ = build$({
 *   commandBuilder,
 *   requestBuilder,
 *   // optional additional functions to add to `$`
 *   extras: {
 *     add(a: number, b: number) {
 *       return a + b;
 *     },
 *   },
 * });
 *
 * // this command will use the env described above, but the main
 * // process and default `$` won't have its environment changed
 * await $`deno run my_script.ts`;
 *
 * // similarly, this will have the headers that were set in the request builder
 * const data = await $.request("https://plugins.dprint.dev/info.json").json();
 *
 * // use the extra function we defined
 * console.log($.add(1, 2));
 * ```
 */
export function build$<TExtras extends ExtrasObject = {}>(
  options: Create$Options<TExtras> = {},
): $Type<TExtras> {
  return build$FromState(buildInitial$State({
    isGlobal: false,
    ...options,
  }));
}

/**
 * Default `$` instance where commands may be executed.
 */
export const $: $Type = build$FromState(buildInitial$State({
  isGlobal: true,
}));
export default $;
