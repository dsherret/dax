import * as pack14 from "https://deno.land/std@0.182.0/fs/mod.ts";
import * as pack34 from "https://deno.land/std@0.182.0/io/buffer.ts";
import * as pack12 from "https://deno.land/std@0.182.0/path/mod.ts";
import * as pack15 from "https://deno.land/x/outdent@v0.8.0/src/index.ts";
import * as pack13 from "https://deno.land/x/which@0.3.0/mod.ts";
import CommandBuilder = pack32.CommandBuilder;
import Delay = pack3.Delay;
import DelayIterator = pack3.DelayIterator;
import ConfirmOptions = pack5.ConfirmOptions;
import MultiSelectOptions = pack5.MultiSelectOptions;
import ProgressBar = pack5.ProgressBar;
import ProgressOptions = pack5.ProgressOptions;
import PromptOptions = pack5.PromptOptions;
import SelectOptions = pack5.SelectOptions;
import fs = pack11.fs;
import outdent = pack11.outdent;
import stdPath = pack11.path;
import which = pack11.which;
import whichSync = pack11.whichSync;
import RequestBuilder = pack4.RequestBuilder;
import createPathRef = pack31.createPathRef;
import PathRef = pack31.PathRef;
/**
 * Cross platform shell tools for Deno inspired by [zx](https://github.com/google/zx).
 *
 * Differences:
 *
 * 1. Minimal globals or global configuration.
 *    - Only a default instance of `$`, but it's not mandatory to use this.
 * 1. No custom CLI.
 * 1. Cross platform shell.
 *    - Makes more code work on Windows.
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
export type $Type<TExtras extends ExtrasObject = {}> =
  & $Template
  & (string extends keyof TExtras ? $BuiltInProperties<TExtras> : Omit<$BuiltInProperties<TExtras>, keyof TExtras>)
  & TExtras;
export interface $Template {
  (strings: TemplateStringsArray, ...exprs: any[]): CommandBuilder;
}
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
  cd(path: string | URL | ImportMeta | PathRef): void;
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
  dedent: typeof outdent;
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
  /** Re-export of deno_std's `fs` module. */
  fs: typeof fs;
  /** Helper function for creating path references, which provide an easier way for
   * working with paths, directories, and files on the file system. Also, a re-export
   * of deno_std's `path` module as properties on this object.
   *
   * The function creates a new `PathRef` from a path or URL string, file URL, or for the current module.
   */
  path: typeof createPathRef & typeof stdPath;
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
type ExtrasObject = Record<string, (...args: any[]) => unknown>;
/** Options for creating a custom `$`. */
export interface Create$Options<TExtras extends ExtrasObject> {
  /** Uses the state of this command builder as a starting point. */
  commandBuilder?: CommandBuilder;
  /** Uses the state of this request builder as a starting point. */
  requestBuilder?: RequestBuilder;
  extras?: TExtras;
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
export function build$<TExtras extends ExtrasObject = {}>(options?: Create$Options<TExtras>): $Type<TExtras>;
/**
 * Default `$` instance where commands may be executed.
 */
export const $: $Type;
export default $;
import __export1 = pack31.FsFileWrapper;
export { __export1 as FsFileWrapper };
import __export2 = pack31.PathRef;
export { __export2 as PathRef };
import __export3 = pack31.PathSymlinkOptions;
export { __export3 as PathSymlinkOptions };
import __export4 = pack31.SymlinkOptions;
export { __export4 as SymlinkOptions };
import __export5 = pack31.WalkEntry;
export { __export5 as WalkEntry };
import __export6 = pack32.CommandBuilder;
export { __export6 as CommandBuilder };
import __export7 = pack32.CommandResult;
export { __export7 as CommandResult };
import __export8 = pack1.CommandContext;
export { __export8 as CommandContext };
import __export9 = pack1.CommandHandler;
export { __export9 as CommandHandler };
import __export10 = pack1.CommandPipeReader;
export { __export10 as CommandPipeReader };
import __export11 = pack1.CommandPipeWriter;
export { __export11 as CommandPipeWriter };
import __export12 = pack5.ConfirmOptions;
export { __export12 as ConfirmOptions };
import __export13 = pack5.MultiSelectOption;
export { __export13 as MultiSelectOption };
import __export14 = pack5.MultiSelectOptions;
export { __export14 as MultiSelectOptions };
import __export15 = pack5.ProgressBar;
export { __export15 as ProgressBar };
import __export16 = pack5.ProgressOptions;
export { __export16 as ProgressOptions };
import __export17 = pack5.PromptOptions;
export { __export17 as PromptOptions };
import __export18 = pack5.SelectOptions;
export { __export18 as SelectOptions };
import __export19 = pack4.RequestBuilder;
export { __export19 as RequestBuilder };
import __export20 = pack4.RequestResult;
export { __export20 as RequestResult };
import __export21 = pack2.CdChange;
export { __export21 as CdChange };
import __export22 = pack2.ContinueExecuteResult;
export { __export22 as ContinueExecuteResult };
import __export23 = pack2.EnvChange;
export { __export23 as EnvChange };
import __export24 = pack2.ExecuteResult;
export { __export24 as ExecuteResult };
import __export25 = pack2.ExitExecuteResult;
export { __export25 as ExitExecuteResult };
import __export26 = pack2.SetEnvVarChange;
export { __export26 as SetEnvVarChange };
import __export27 = pack2.SetShellVarChange;
export { __export27 as SetShellVarChange };
declare module pack32 {
  import CommandHandler = pack1.CommandHandler;
  import Delay = pack3.Delay;
  import Buffer = pack11.Buffer;
  import ShellPipeReader = pack33.ShellPipeReader;
  import ShellPipeWriterKind = pack33.ShellPipeWriterKind;
  import PathRef = pack31.PathRef;
  type BufferStdio = "inherit" | "null" | "streamed" | Buffer;
  /**
   * Underlying builder API for executing commands.
   *
   * This is what `$` uses to execute commands. Using this provides
   * a way to provide a raw text command or an array of arguments.
   *
   * Command builders are immutable where each method call creates
   * a new command builder.
   *
   * ```ts
   * const builder = new CommandBuilder()
   *  .cwd("./src")
   *  .command("echo $MY_VAR");
   *
   * // outputs 5
   * console.log(await builder.env("MY_VAR", "5").text());
   * // outputs 6
   * console.log(await builder.env("MY_VAR", "6").text());
   * ```
   */
  export class CommandBuilder implements PromiseLike<CommandResult> {
    #private;
    then<TResult1 = CommandResult, TResult2 = never>(
      onfulfilled?: ((value: CommandResult) => TResult1 | PromiseLike<TResult1>) | null | undefined,
      onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null | undefined,
    ): PromiseLike<TResult1 | TResult2>;
    /**
     * Explicit way to spawn a command.
     *
     * This is an alias for awaiting the command builder or calling `.then(...)`
     */
    spawn(): CommandChild;
    /**
     * Register a command.
     */
    registerCommand(command: string, handleFn: CommandHandler): CommandBuilder;
    /**
     * Register multilple commands.
     */
    registerCommands(commands: Record<string, CommandHandler>): CommandBuilder;
    /**
     * Unregister a command.
     */
    unregisterCommand(command: string): CommandBuilder;
    /** Sets the raw command to execute. */
    command(command: string | string[]): CommandBuilder;
    /** The command should not throw when it fails or times out. */
    noThrow(value?: boolean): CommandBuilder;
    /**
     * Whether to capture a combined buffer of both stdout and stderr.
     *
     * This will set both stdout and stderr to "piped" if not already "piped"
     * or "inheritPiped".
     */
    captureCombined(value?: boolean): CommandBuilder;
    /**
     * Sets the stdin to use for the command.
     *
     * @remarks If multiple launches of a command occurs, then stdin will only be
     * read from the first consumed reader or readable stream and error otherwise.
     * For this reason, if you are setting stdin to something other than "inherit" or
     * "null", then it's recommended to set this each time you spawn a command.
     */
    stdin(reader: ShellPipeReader | Uint8Array | ReadableStream<Uint8Array>): CommandBuilder;
    /**
     * Sets the stdin string to use for a command.
     *
     * @remarks See the remarks on stdin. The same applies here.
     */
    stdinText(text: string): CommandBuilder;
    /** Set the stdout kind. */
    stdout(kind: ShellPipeWriterKind): CommandBuilder;
    /** Set the stderr kind. */
    stderr(kind: ShellPipeWriterKind): CommandBuilder;
    /** Sets multiple environment variables to use at the same time via an object literal. */
    env(items: Record<string, string | undefined>): CommandBuilder;
    /** Sets a single environment variable to use. */
    env(name: string, value: string | undefined): CommandBuilder;
    /** Sets the current working directory to use when executing this command. */
    cwd(dirPath: string | URL | PathRef): CommandBuilder;
    /**
     * Exports the environment of the command to the executing process.
     *
     * So for example, changing the directory in a command or exporting
     * an environment variable will actually change the environment
     * of the executing process.
     *
     * ```ts
     * await $`cd src && export SOME_VALUE=5`;
     * console.log(Deno.env.get("SOME_VALUE")); // 5
     * console.log(Deno.cwd()); // will be in the src directory
     * ```
     */
    exportEnv(value?: boolean): CommandBuilder;
    /**
     * Prints the command text before executing the command.
     *
     * For example:
     *
     * ```ts
     * const text = "example";
     * await $`echo ${text}`.printCommand();
     * ```
     *
     * Outputs:
     *
     * ```
     * > echo example
     * example
     * ```
     */
    printCommand(value?: boolean): CommandBuilder;
    /**
     * Mutates the command builder to change the logger used
     * for `printCommand()`.
     */
    setPrintCommandLogger(logger: (...args: any[]) => void): void;
    /**
     * Ensures stdout and stderr are piped if they have the default behaviour or are inherited.
     *
     * ```ts
     * // ensure both stdout and stderr is not logged to the console
     * await $`echo 1`.quiet();
     * // ensure stdout is not logged to the console
     * await $`echo 1`.quiet("stdout");
     * // ensure stderr is not logged to the console
     * await $`echo 1`.quiet("stderr");
     * ```
     */
    quiet(kind?: "stdout" | "stderr" | "both"): CommandBuilder;
    /**
     * Specifies a timeout for the command. The command will exit with
     * exit code `124` (timeout) if it times out.
     *
     * Note that when using `.noThrow()` this won't cause an error to
     * be thrown when timing out.
     */
    timeout(delay: Delay | undefined): CommandBuilder;
    /**
     * Sets stdout as quiet, spawns the command, and gets stdout as a Uint8Array.
     *
     * Shorthand for:
     *
     * ```ts
     * const data = (await $`command`.quiet("stdout")).stdoutBytes;
     * ```
     */
    bytes(): Promise<Uint8Array>;
    /**
     * Sets stdout as quiet, spawns the command, and gets stdout as a string without the last newline.
     *
     * Shorthand for:
     *
     * ```ts
     * const data = (await $`command`.quiet("stdout")).stdout.replace(/\r?\n$/, "");
     * ```
     */
    text(): Promise<string>;
    /** Gets the text as an array of lines. */
    lines(): Promise<string[]>;
    /**
     * Sets stdout as quiet, spawns the command, and gets stdout as JSON.
     *
     * Shorthand for:
     *
     * ```ts
     * const data = (await $`command`.quiet("stdout")).stdoutJson;
     * ```
     */
    json<TResult = any>(): Promise<TResult>;
  }
  export class CommandChild extends Promise<CommandResult> {
    #private;
    /** Cancels the executing command if able. */
    abort(): void;
    stdout(): ReadableStream<Uint8Array>;
    stderr(): ReadableStream<Uint8Array>;
  }
  /** Result of running a command. */
  export class CommandResult {
    #private;
    /** The exit code. */
    readonly code: number;
    constructor(code: number, stdout: BufferStdio, stderr: BufferStdio, combined: Buffer | undefined);
    /** Raw decoded stdout text. */
    get stdout(): string;
    /**
     * Stdout text as JSON.
     *
     * @remarks Will throw if it can't be parsed as JSON.
     */
    get stdoutJson(): any;
    /** Raw stdout bytes. */
    get stdoutBytes(): Uint8Array;
    /** Raw decoded stdout text. */
    get stderr(): string;
    /**
     * Stderr text as JSON.
     *
     * @remarks Will throw if it can't be parsed as JSON.
     */
    get stderrJson(): any;
    /** Raw stderr bytes. */
    get stderrBytes(): Uint8Array;
    /** Raw combined stdout and stderr text. */
    get combined(): string;
    /** Raw combined stdout and stderr bytes. */
    get combinedBytes(): Uint8Array;
  }
}
declare module pack1 {
  import ExecuteResult = pack2.ExecuteResult;
  /** Used to read from stdin. */
  export type CommandPipeReader = "inherit" | "null" | Deno.Reader;
  /** Used to write to stdout or stderr. */
  export interface CommandPipeWriter extends Deno.WriterSync {
    writeSync(p: Uint8Array): number;
    writeText(text: string): void;
    writeLine(text: string): void;
  }
  /** Context of the currently executing command. */
  export interface CommandContext {
    get args(): string[];
    get cwd(): string;
    get env(): Record<string, string>;
    get stdin(): CommandPipeReader;
    get stdout(): CommandPipeWriter;
    get stderr(): CommandPipeWriter;
    get signal(): AbortSignal;
  }
  /** Handler for executing a command. */
  export type CommandHandler = (context: CommandContext) => Promise<ExecuteResult> | ExecuteResult;
}
declare module pack3 {
  /**
   * Delay used for certain actions.
   *
   * @remarks Providing just a number will use milliseconds.
   */
  export type Delay =
    | number
    | `${number}ms`
    | `${number}s`
    | `${number}m`
    | `${number}m${number}s`
    | `${number}h`
    | `${number}h${number}m`
    | `${number}h${number}m${number}s`;
  /** An iterator that returns a new delay each time. */
  export interface DelayIterator {
    next(): number;
  }
}
declare module pack9 {
  /** Options for showing confirming a yes or no question. */
  export interface ConfirmOptions {
    /** Message to display to the user. */
    message: string;
    /**
     * Default value.
     * @default `undefined`
     */
    default?: boolean | undefined;
    /**
     * Whether to not clear the prompt text on selection.
     * @default `false`
     */
    noClear?: boolean;
  }
}
declare module pack5 {
  import __export1 = pack9.ConfirmOptions;
  export { __export1 as ConfirmOptions };
  import __export2 = pack8.MultiSelectOption;
  export { __export2 as MultiSelectOption };
  import __export3 = pack8.MultiSelectOptions;
  export { __export3 as MultiSelectOptions };
  import __export4 = pack10.ProgressOptions;
  export { __export4 as ProgressOptions };
  import __export5 = pack10.ProgressBar;
  export { __export5 as ProgressBar };
  import __export6 = pack7.PromptOptions;
  export { __export6 as PromptOptions };
  import __export7 = pack6.SelectOptions;
  export { __export7 as SelectOptions };
  const __packTsUnder5_2_Workaround__: unknown;
}
declare module pack8 {
  /** Single options within a multi-select option. */
  export interface MultiSelectOption {
    /** Text to display for this option. */
    text: string;
    /** Whether it is selected by default. */
    selected?: boolean;
  }
  /** Options for showing a selection that has multiple possible values. */
  export interface MultiSelectOptions {
    /** Prompt text to show the user. */
    message: string;
    /** Options to show the user. */
    options: (string | MultiSelectOption)[];
    /**
     * Whether to not clear the prompt text on selection.
     * @default `false`
     */
    noClear?: boolean;
  }
}
declare module pack10 {
  /** Options for showing progress. */
  export interface ProgressOptions {
    /** Prefix message/word that will be displayed in green. */
    prefix?: string;
    /** Message to show after the prefix in white. */
    message?: string;
    /**
     * Optional length if known.
     *
     * If this is undefined then the progress will be indeterminate.
     */
    length?: number;
    /** Do not clear the progress bar when finishing it. */
    noClear?: boolean;
  }
  /** A progress bar instance created via `$.progress(...)`. */
  export class ProgressBar {
    #private;
    /** Sets the prefix message/word, which will be displayed in green. */
    prefix(prefix: string | undefined): this;
    /** Sets the message the progress bar will display after the prefix in white. */
    message(message: string | undefined): this;
    /** Sets how to format the length values. */
    kind(kind: "raw" | "bytes"): this;
    /** Sets the current position of the progress bar. */
    position(position: number): this;
    /** Increments the position of the progress bar. */
    increment(inc?: number): this;
    /** Sets the total length of the progress bar. */
    length(size: number | undefined): this;
    /** Whether the progress bar should output a summary when finished. */
    noClear(value?: boolean): this;
    /** Forces a render to the console. */
    forceRender(): void;
    /** Finish showing the progress bar. */
    finish(): void;
    /** Does the provided action and will call `.finish()` when this is the last `.with(...)` action that runs. */
    with<TResult>(action: () => TResult): TResult;
    with<TResult>(action: () => Promise<TResult>): Promise<TResult>;
  }
}
declare module pack7 {
  /** Options for showing an input where the user enters a value. */
  export interface PromptOptions {
    /** Message to display to the user. */
    message: string;
    /**
     * Default value.
     */
    default?: string;
    /**
     * Whether typed characters should be hidden by
     * a mask, optionally allowing a choice of mask
     * character (`*` by default) and whether or not
     * to keep the final character visible as the user
     * types (`false` by default).
     * @default `false`
     */
    mask?: InputMask | boolean;
    /**
     * Whether to not clear the prompt text on selection.
     * @default `false`
     */
    noClear?: boolean;
  }
  /** Configuration of the prompt input mask */
  export interface InputMask {
    /** The character used to mask input (`*` by default) */
    char?: string;
    /** Whether or not to keep the last character "unmasked" (`false` by default) */
    lastVisible?: boolean;
  }
}
declare module pack6 {
  /** Options for showing a selection that only has one result. */
  export interface SelectOptions {
    /** Prompt text to show the user. */
    message: string;
    /** Initial selected option index. Defaults to 0. */
    initialIndex?: number;
    /** Options to show the user. */
    options: string[];
    /**
     * Whether to not clear the selection text on selection.
     * @default `false`
     */
    noClear?: boolean;
  }
}
declare module pack11 {
  import __export1 = pack14;
  export { __export1 as fs };
  import __export2 = pack34.Buffer;
  export { __export2 as Buffer };
  import __export3 = pack12;
  export { __export3 as path };
  import __export4 = pack15.outdent;
  export { __export4 as outdent };
  import __export5 = pack13.which;
  export { __export5 as which };
  import __export6 = pack13.whichSync;
  export { __export6 as whichSync };
  const __packTsUnder5_2_Workaround__: unknown;
}
declare module pack31 {
  export function createPathRef(path: string | URL | ImportMeta | PathRef): PathRef;
  export interface WalkEntry extends Deno.DirEntry {
    path: PathRef;
  }
  export interface PathSymlinkOptions {
    /** Creates the symlink as absolute or relative. */
    kind: "absolute" | "relative";
  }
  export interface SymlinkOptions extends Partial<Deno.SymlinkOptions>, Partial<PathSymlinkOptions> {
  }
  /**
   * Holds a reference to a path providing helper methods.
   *
   * Create one via `$`: `const srcDir = $.path("src");`
   */
  export class PathRef {
    #private;
    constructor(path: string | URL | ImportMeta | PathRef);
    /** Gets the string representation of this path. */
    toString(): string;
    /** Resolves the path and gets the file URL. */
    toFileUrl(): URL;
    /** If this path reference is the same as another one. */
    equals(otherPath: PathRef): boolean;
    /** Joins the provided path segments onto this path. */
    join(...pathSegments: string[]): PathRef;
    /** Resolves this path to an absolute path along with the provided path segments. */
    resolve(...pathSegments: string[]): PathRef;
    /**
     * Normalizes the `path`, resolving `'..'` and `'.'` segments.
     * Note that resolving these segments does not necessarily mean that all will be eliminated.
     * A `'..'` at the top-level will be preserved, and an empty path is canonically `'.'`.
     */
    normalize(): PathRef;
    /** Follows symlinks and gets if this path is a directory. */
    isDir(): boolean;
    /** Follows symlinks and gets if this path is a file. */
    isFile(): boolean;
    /** Gets if this path is a symlink. */
    isSymlink(): boolean;
    /** Gets if this path is an absolute path. */
    isAbsolute(): boolean;
    /** Gets if this path is relative. */
    isRelative(): boolean;
    /** Resolves the `Deno.FileInfo` of this path following symlinks. */
    stat(): Promise<Deno.FileInfo | undefined>;
    /** Synchronously resolves the `Deno.FileInfo` of this
     * path following symlinks. */
    statSync(): Deno.FileInfo | undefined;
    /** Resolves the `Deno.FileInfo` of this path without
     * following symlinks. */
    lstat(): Promise<Deno.FileInfo | undefined>;
    /** Synchronously resolves the `Deno.FileInfo` of this path
     * without following symlinks. */
    lstatSync(): Deno.FileInfo | undefined;
    /**
     * Gets the directory path. In most cases, it is recommended
     * to use `.parent()` instead since it will give you a `PathRef`.
     */
    dirname(): string;
    /** Gets the file or directory name of the path. */
    basename(): string;
    /** Resolves the path getting all its ancestor directories in order. */
    ancestors(): Generator<PathRef>;
    /** Gets the parent directory or returns undefined if the parent is the root directory. */
    parent(): PathRef | undefined;
    /** Gets the parent or throws if the current directory was the root. */
    parentOrThrow(): PathRef;
    /**
     * Returns the extension of the path with leading period or undefined
     * if there is no extension.
     */
    extname(): string | undefined;
    /** Gets a new path reference with the provided extension. */
    withExtname(ext: string): PathRef;
    /** Gets a new path reference with the provided file or directory name. */
    withBasename(basename: string): PathRef;
    /** Gets the relative path from this path to the specified path. */
    relative(to: string | URL | PathRef): string;
    /** Gets if the path exists. Beaware of TOCTOU issues. */
    exists(): Promise<boolean>;
    /** Synchronously gets if the path exists. Beaware of TOCTOU issues. */
    existsSync(): boolean;
    /** Resolves to the absolute normalized path, with symbolic links resolved. */
    realPath(): Promise<PathRef>;
    /** Synchronously resolves to the absolute normalized path, with symbolic links resolved. */
    realPathSync(): PathRef;
    /** Expands the glob using the current path as the root. */
    expandGlob(
      glob: string | URL,
      options?: Omit<fs.ExpandGlobOptions, "root">,
    ): AsyncGenerator<WalkEntry, void, unknown>;
    /** Synchronously expands the glob using the current path as the root. */
    expandGlobSync(
      glob: string | URL,
      options?: Omit<fs.ExpandGlobOptions, "root">,
    ): Generator<WalkEntry, void, unknown>;
    /** Walks the file tree rooted at the current path, yielding each file or
     * directory in the tree filtered according to the given options. */
    walk(options?: fs.WalkOptions): AsyncIterableIterator<WalkEntry>;
    /** Synchronously walks the file tree rooted at the current path, yielding each
     * file or directory in the tree filtered according to the given options. */
    walkSync(options?: fs.WalkOptions): Iterable<WalkEntry>;
    /** Creates a directory at this path.
     * @remarks By default, this is recursive.
     */
    mkdir(options?: Deno.MkdirOptions): Promise<this>;
    /** Synchronously creates a directory at this path.
     * @remarks By default, this is recursive.
     */
    mkdirSync(options?: Deno.MkdirOptions): this;
    /**
     * Creates a symlink to the provided target path.
     */
    createSymlinkTo(targetPath: URL | PathRef, opts: Partial<Deno.SymlinkOptions> & PathSymlinkOptions): Promise<void>;
    /**
     * Creates a symlink at the provided path with the provided target text.
     */
    createSymlinkTo(target: string, opts?: SymlinkOptions): Promise<void>;
    /**
     * Synchronously creates a symlink to the provided target path.
     */
    createSymlinkToSync(targetPath: URL | PathRef, opts: Partial<Deno.SymlinkOptions> & PathSymlinkOptions): void;
    /**
     * Synchronously creates a symlink at the provided path with the provided target text.
     */
    createSymlinkToSync(target: string, opts?: SymlinkOptions): void;
    /** Reads the entries in the directory. */
    readDir(): AsyncIterable<WalkEntry>;
    /** Synchronously reads the entries in the directory. */
    readDirSync(): Iterable<WalkEntry>;
    /** Reads only the directory file paths, not including symlinks. */
    readDirFilePaths(): AsyncIterable<PathRef>;
    /** Synchronously reads only the directory file paths, not including symlinks. */
    readDirFilePathsSync(): Iterable<PathRef>;
    /** Reads the bytes from the file. */
    readBytes(options?: Deno.ReadFileOptions): Promise<Uint8Array>;
    /** Synchronously reads the bytes from the file. */
    readBytesSync(): Uint8Array;
    /** Calls `.readBytes()`, but returns undefined if the path doesn't exist. */
    readMaybeBytes(options?: Deno.ReadFileOptions): Promise<Uint8Array | undefined>;
    /** Calls `.readBytesSync()`, but returns undefined if the path doesn't exist. */
    readMaybeBytesSync(): Uint8Array | undefined;
    /** Reads the text from the file. */
    readText(options?: Deno.ReadFileOptions): Promise<string>;
    /** Synchronously reads the text from the file. */
    readTextSync(): string;
    /** Calls `.readText()`, but returns undefined when the path doesn't exist.
     * @remarks This still errors for other kinds of errors reading a file.
     */
    readMaybeText(options?: Deno.ReadFileOptions): Promise<string | undefined>;
    /** Calls `.readTextSync()`, but returns undefined when the path doesn't exist.
     * @remarks This still errors for other kinds of errors reading a file.
     */
    readMaybeTextSync(): string | undefined;
    /** Reads and parses the file as JSON, throwing if it doesn't exist or is not valid JSON. */
    readJson<T>(options?: Deno.ReadFileOptions): Promise<T>;
    /** Synchronously reads and parses the file as JSON, throwing if it doesn't
     * exist or is not valid JSON. */
    readJsonSync<T>(): T;
    /**
     * Calls `.readJson()`, but returns undefined if the file doesn't exist.
     * @remarks This method will still throw if the file cannot be parsed as JSON.
     */
    readMaybeJson<T>(options?: Deno.ReadFileOptions): Promise<T | undefined>;
    /**
     * Calls `.readJsonSync()`, but returns undefined if the file doesn't exist.
     * @remarks This method will still throw if the file cannot be parsed as JSON.
     */
    readMaybeJsonSync<T>(): T | undefined;
    /** Writes out the provided bytes to the file. */
    write(data: Uint8Array, options?: Deno.WriteFileOptions): Promise<this>;
    /** Synchronously writes out the provided bytes to the file. */
    writeSync(data: Uint8Array, options?: Deno.WriteFileOptions): this;
    /** Writes out the provided text to the file. */
    writeText(text: string, options?: Deno.WriteFileOptions): Promise<this>;
    /** Synchronously writes out the provided text to the file. */
    writeTextSync(text: string, options?: Deno.WriteFileOptions): this;
    /** Writes out the provided object as compact JSON. */
    writeJson(obj: unknown, options?: Deno.WriteFileOptions): Promise<this>;
    /** Synchronously writes out the provided object as compact JSON. */
    writeJsonSync(obj: unknown, options?: Deno.WriteFileOptions): this;
    /** Writes out the provided object as formatted JSON. */
    writeJsonPretty(obj: unknown, options?: Deno.WriteFileOptions): Promise<this>;
    /** Synchronously writes out the provided object as formatted JSON. */
    writeJsonPrettySync(obj: unknown, options?: Deno.WriteFileOptions): this;
    /** Changes the permissions of the file or directory. */
    chmod(mode: number): Promise<this>;
    /** Synchronously changes the permissions of the file or directory. */
    chmodSync(mode: number): this;
    /** Changes the ownership permissions of the file. */
    chown(uid: number | null, gid: number | null): Promise<this>;
    /** Synchronously changes the ownership permissions of the file. */
    chownSync(uid: number | null, gid: number | null): this;
    /** Creates a new file or opens the existing one. */
    create(): Promise<FsFileWrapper>;
    /** Synchronously creates a new file or opens the existing one. */
    createSync(): FsFileWrapper;
    /** Creates a file throwing if a file previously existed. */
    createNew(): Promise<FsFileWrapper>;
    /** Synchronously creates a file throwing if a file previously existed. */
    createNewSync(): FsFileWrapper;
    /** Opens a file. */
    open(options?: Deno.OpenOptions): Promise<FsFileWrapper>;
    /** Opens a file synchronously. */
    openSync(options?: Deno.OpenOptions): FsFileWrapper;
    /** Removes the file or directory from the file system. */
    remove(options?: Deno.RemoveOptions): Promise<this>;
    /** Removes the file or directory from the file system synchronously. */
    removeSync(options?: Deno.RemoveOptions): this;
    /**
     * Ensures that a directory is empty.
     * Deletes directory contents if the directory is not empty.
     * If the directory does not exist, it is created.
     * The directory itself is not deleted.
     */
    emptyDir(): Promise<this>;
    /** Synchronous version of `emptyDir()` */
    emptyDirSync(): this;
    /**
     * Copies the file returning a promise that resolves to
     * the destination path.
     */
    copyFile(destinationPath: string | URL | PathRef): Promise<PathRef>;
    /**
     * Copies the file returning a promise that resolves to
     * the destination path synchronously.
     */
    copyFileSync(destinationPath: string | URL | PathRef): PathRef;
    /**
     * Renames the file or directory returning a promise that resolves to
     * the renamed path.
     */
    rename(newPath: string | URL | PathRef): Promise<PathRef>;
    /**
     * Renames the file or directory returning a promise that resolves to
     * the renamed path synchronously.
     */
    renameSync(newPath: string | URL | PathRef): PathRef;
    /** Opens the file and pipes it to the writable stream. */
    pipeTo(dest: WritableStream<Uint8Array>, options?: PipeOptions): Promise<this>;
  }
  export class FsFileWrapper implements Deno.FsFile {
    #private;
    constructor(file: Deno.FsFile);
    /** Gets the inner `Deno.FsFile` that this wraps. */
    get inner(): Deno.FsFile;
    /** Writes the provided text to this file. */
    writeText(text: string): Promise<this>;
    /** Synchronously writes the provided text to this file. */
    writeTextSync(text: string): this;
    /** Writes the provided bytes to the file. */
    writeBytes(bytes: Uint8Array): Promise<this>;
    /** Synchronously writes the provided bytes to the file. */
    writeBytesSync(bytes: Uint8Array): this;
    get rid(): number;
    get readable(): ReadableStream<Uint8Array>;
    get writable(): WritableStream<Uint8Array>;
    write(p: Uint8Array): Promise<number>;
    writeSync(p: Uint8Array): number;
    truncate(len?: number | undefined): Promise<void>;
    truncateSync(len?: number | undefined): void;
    read(p: Uint8Array): Promise<number | null>;
    readSync(p: Uint8Array): number | null;
    seek(offset: number, whence: Deno.SeekMode): Promise<number>;
    seekSync(offset: number, whence: Deno.SeekMode): number;
    stat(): Promise<Deno.FileInfo>;
    statSync(): Deno.FileInfo;
    close(): void;
  }
}
declare module pack33 {
  export type ShellPipeReader = "inherit" | "null" | Deno.Reader;
  /**
   * The behaviour to use for a shell pipe.
   * @value "inherit" - Sends the output directly to the current process' corresponding pipe (default).
   * @value "null" - Does not pipe or redirect the pipe.
   * @value "piped" - Captures the pipe without outputting.
   * @value "inheritPiped" - Captures the pipe with outputting.
   */
  export type ShellPipeWriterKind = "inherit" | "null" | "piped" | "inheritPiped";
}
declare module pack4 {
  import Delay = pack3.Delay;
  import ProgressBar = pack5.ProgressBar;
  import PathRef = pack31.PathRef;
  /**
   * Builder API for downloading files.
   */
  export class RequestBuilder implements PromiseLike<RequestResult> {
    #private;
    then<TResult1 = RequestResult, TResult2 = never>(
      onfulfilled?: ((value: RequestResult) => TResult1 | PromiseLike<TResult1>) | null | undefined,
      onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null | undefined,
    ): PromiseLike<TResult1 | TResult2>;
    /** Fetches and gets the response. */
    fetch(): Promise<RequestResult>;
    /** Specifies the URL to send the request to. */
    url(value: string | URL | undefined): RequestBuilder;
    /** Sets multiple headers at the same time via an object literal. */
    header(items: Record<string, string | undefined>): RequestBuilder;
    /** Sets a header to send with the request. */
    header(name: string, value: string | undefined): RequestBuilder;
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
    body(value: BodyInit | undefined): RequestBuilder;
    cache(value: RequestCache | undefined): RequestBuilder;
    integrity(value: string | undefined): RequestBuilder;
    keepalive(value: boolean): RequestBuilder;
    method(value: string): RequestBuilder;
    mode(value: RequestMode): RequestBuilder;
    redirect(value: RequestRedirect): RequestBuilder;
    referrer(value: string | undefined): RequestBuilder;
    referrerPolicy(value: ReferrerPolicy | undefined): RequestBuilder;
    /** Shows a progress bar while downloading with the provided options. */
    showProgress(opts: {
      noClear?: boolean;
    }): RequestBuilder;
    /** Shows a progress bar while downloading. */
    showProgress(show?: boolean): RequestBuilder;
    /** Timeout the request after the specified delay. */
    timeout(delay: Delay | undefined): RequestBuilder;
    /** Fetches and gets the response as an array buffer. */
    arrayBuffer(): Promise<ArrayBuffer>;
    /** Fetches and gets the response as a blob. */
    blob(): Promise<Blob>;
    /** Fetches and gets the response as form data. */
    formData(): Promise<FormData>;
    /** Fetches and gets the response as JSON additionally setting
     * a JSON accept header if not set. */
    json<TResult = any>(): Promise<TResult>;
    /** Fetches and gets the response as text. */
    text(): Promise<string>;
    /** Pipes the response body to the provided writable stream. */
    pipeTo(dest: WritableStream<Uint8Array>, options?: PipeOptions): Promise<void>;
    /**
     * Pipes the response body to a file.
     *
     * @remarks The path will be derived from the request's url
     * and downloaded to the current working directory.
     *
     * @returns The path reference of the downloaded file.
     */
    pipeToPath(options?: Deno.WriteFileOptions): Promise<PathRef>;
    /**
     * Pipes the response body to a file.
     *
     * @remarks If no path is provided then it will be derived from the
     * request's url and downloaded to the current working directory.
     *
     * @returns The path reference of the downloaded file.
     */
    pipeToPath(path?: string | URL | PathRef | undefined, options?: Deno.WriteFileOptions): Promise<PathRef>;
    /** Pipes the response body through the provided transform. */
    pipeThrough<T>(transform: {
      writable: WritableStream<Uint8Array>;
      readable: ReadableStream<T>;
    }): Promise<ReadableStream<T>>;
  }
  /** Result of making a request. */
  export class RequestResult {
    #private;
    constructor(opts: {
      response: Response;
      originalUrl: string;
      progressBar: ProgressBar | undefined;
    });
    /** Raw response. */
    get response(): Response;
    /** Response headers. */
    get headers(): Headers;
    /** If the response had a 2xx code. */
    get ok(): boolean;
    /** If the response is the result of a redirect. */
    get redirected(): boolean;
    /** Status code of the response. */
    get status(): number;
    /** Status text of the response. */
    get statusText(): string;
    /** URL of the response. */
    get url(): string;
    /**
     * Throws if the response doesn't have a 2xx code.
     *
     * This might be useful if the request was built with `.noThrow()`, but
     * otherwise this is called automatically for any non-2xx response codes.
     */
    throwIfNotOk(): void;
    /**
     * Respose body as an array buffer.
     *
     * Note: Returns `undefined` when `.noThrow(404)` and status code is 404.
     */
    arrayBuffer(): Promise<ArrayBuffer>;
    /**
     * Response body as a blog.
     *
     * Note: Returns `undefined` when `.noThrow(404)` and status code is 404.
     */
    blob(): Promise<Blob>;
    /**
     * Response body as a form data.
     *
     * Note: Returns `undefined` when `.noThrow(404)` and status code is 404.
     */
    formData(): Promise<FormData>;
    /**
     * Respose body as JSON.
     *
     * Note: Returns `undefined` when `.noThrow(404)` and status code is 404.
     */
    json<TResult = any>(): Promise<TResult>;
    /**
     * Respose body as text.
     *
     * Note: Returns `undefined` when `.noThrow(404)` and status code is 404.
     */
    text(): Promise<string>;
    /** Pipes the response body to the provided writable stream. */
    pipeTo(dest: WritableStream<Uint8Array>, options?: PipeOptions): Promise<void>;
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
    pipeToPath(options?: Deno.WriteFileOptions): Promise<PathRef>;
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
    pipeToPath(path?: string | URL | PathRef | undefined, options?: Deno.WriteFileOptions): Promise<PathRef>;
    /** Pipes the response body through the provided transform. */
    pipeThrough<T>(transform: {
      writable: WritableStream<Uint8Array>;
      readable: ReadableStream<T>;
    }): ReadableStream<T>;
  }
}
declare module pack2 {
  /** Result of executing a custom command. */
  export type ExecuteResult = ExitExecuteResult | ContinueExecuteResult;
  /** Tells the shell it should exit immediately with the provided exit code. */
  export interface ExitExecuteResult {
    kind: "exit";
    code: number;
  }
  /** Tells the shell to continue executing. */
  export interface ContinueExecuteResult {
    kind: "continue";
    code: number;
    changes?: EnvChange[];
  }
  /** Change that alters the environment.
   *
   * Used for registering custom commands.
   */
  export type EnvChange = SetEnvVarChange | SetShellVarChange | UnsetVarChange | CdChange;
  /** Change that sets an environment variable (ex. `export ENV_VAR=VALUE`)
   *
   * Used for registering custom commands.
   */
  export interface SetEnvVarChange {
    kind: "envvar";
    name: string;
    value: string;
  }
  /** Change that sets a shell variable (ex. `ENV_VAR=VALUE`)
   *
   * Used for registering custom commands.
   */
  export interface SetShellVarChange {
    kind: "shellvar";
    name: string;
    value: string;
  }
  /** Change that deletes the environment variable (ex. `unset ENV_VAR`).
   *
   * Used for registering custom commands.
   */
  export interface UnsetVarChange {
    kind: "unsetvar";
    name: string;
  }
  /** Change that alters the current working directory.
   *
   * Used for registering custom commands.
   */
  export interface CdChange {
    kind: "cd";
    dir: string;
  }
}
