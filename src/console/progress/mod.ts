import { colors } from "../../deps.ts";
import { type ConsoleSize, isOutputTty, safeConsoleSize, type TextItem } from "../utils.ts";
import { humanDownloadSize } from "./format.ts";
import { addProgressBar, forceRender, removeProgressBar, type RenderIntervalProgressBar } from "./interval.ts";

export { isShowingProgressBars } from "./interval.ts";

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
  #state: RenderState;
  #pb: RenderIntervalProgressBar;
  #withCount = 0;
  #onLog: (...data: any[]) => void;
  #noClear: boolean;

  /** @internal */
  constructor(onLog: (...data: any[]) => void, opts: ProgressOptions) {
    if (arguments.length !== 2) {
      throw new Error("Invalid usage. Create the progress bar via `$.progress`.");
    }
    this.#onLog = onLog;
    this.#state = {
      message: opts.message,
      prefix: opts.prefix,
      length: opts.length,
      currentPos: 0,
      tickCount: 0,
      hasCompleted: false,
      kind: "raw",
    };
    this.#pb = addProgressBar((size) => {
      this.#state.tickCount++;
      return renderProgressBar(this.#state, size);
    });
    this.#noClear = opts.noClear ?? false;

    this.#logIfNonInteractive();
  }

  /** Sets the prefix message/word, which will be displayed in green. */
  prefix(prefix: string | undefined): this {
    this.#state.prefix = prefix;
    if (prefix != null && prefix.length > 0) {
      this.#logIfNonInteractive();
    }
    return this;
  }

  /** Sets the message the progress bar will display after the prefix in white. */
  message(message: string | undefined): this {
    this.#state.message = message;

    if (message != null && message.length > 0) {
      this.#logIfNonInteractive();
    }
    return this;
  }

  /** Sets how to format the length values. */
  kind(kind: "raw" | "bytes"): this {
    this.#state.kind = kind;
    return this;
  }

  #logIfNonInteractive() {
    if (isOutputTty) {
      return;
    }
    let text = this.#state.prefix ?? "";
    if (text.length > 0) {
      text += " ";
    }
    text += this.#state.message ?? "";
    if (text.length > 0) {
      this.#onLog(text);
    }
  }

  /** Sets the current position of the progress bar. */
  position(position: number): this {
    this.#state.currentPos = position;
    return this;
  }

  /** Increments the position of the progress bar. */
  increment(inc = 1): this {
    this.#state.currentPos += inc;
    return this;
  }

  /** Sets the total length of the progress bar. */
  length(size: number | undefined): this {
    this.#state.length = size;
    return this;
  }

  /** Whether the progress bar should output a summary when finished. */
  noClear(value = true): this {
    this.#noClear = value;
    return this;
  }

  /** Forces a render to the console. */
  forceRender(): void {
    return forceRender();
  }

  /** Finish showing the progress bar. */
  finish(): void {
    if (removeProgressBar(this.#pb)) {
      this.#state.hasCompleted = true;
      if (this.#noClear) {
        const text = renderProgressBar(this.#state, safeConsoleSize())
          .map((item) => typeof item === "string" ? item : item.text)
          .join("\n");
        this.#onLog(text);
      }
    }
  }

  /** Does the provided action and will call `.finish()` when this is the last `.with(...)` action that runs. */
  with<TResult>(action: () => TResult): TResult;
  with<TResult>(action: () => Promise<TResult>): Promise<TResult>;
  with<TResult>(action: () => Promise<TResult> | TResult): Promise<TResult> | TResult {
    this.#withCount++;
    let wasAsync = false;
    try {
      const result = action();
      if (result instanceof Promise) {
        wasAsync = true;
        return result.finally(() => {
          this.#decrementWith();
        });
      } else {
        return result;
      }
    } finally {
      if (!wasAsync) {
        this.#decrementWith();
      }
    }
  }

  #decrementWith() {
    this.#withCount--;
    if (this.#withCount === 0) {
      this.finish();
    }
  }
}

interface RenderState {
  message: string | undefined;
  prefix: string | undefined;
  length: number | undefined;
  currentPos: number;
  tickCount: number;
  hasCompleted: boolean;
  kind: "raw" | "bytes";
}

const tickStrings = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

export function renderProgressBar(state: RenderState, size: ConsoleSize | undefined): TextItem[] {
  if (state.hasCompleted) {
    let text = "";
    if (state.prefix != null) {
      text += colors.green(state.prefix);
    }
    if (state.message != null) {
      if (text.length > 0) {
        text += " ";
      }
      text += state.message;
    }
    return text.length > 0 ? [text] : [];
  } else if (state.length == null || state.length === 0) {
    let text = colors.green(tickStrings[Math.abs(state.tickCount) % tickStrings.length]);
    if (state.prefix != null) {
      text += ` ${colors.green(state.prefix)}`;
    }
    if (state.message != null) {
      text += ` ${state.message}`;
    }
    return [text];
  } else {
    let firstLine = "";
    if (state.prefix != null) {
      firstLine += colors.green(state.prefix);
    }
    if (state.message != null) {
      if (firstLine.length > 0) {
        firstLine += " ";
      }
      firstLine += state.message;
    }
    const percent = Math.min(state.currentPos / state.length, 1);
    const currentPosText = state.kind === "bytes"
      ? humanDownloadSize(state.currentPos, state.length)
      : state.currentPos.toString();
    const lengthText = state.kind === "bytes" ? humanDownloadSize(state.length, state.length) : state.length.toString();
    const maxWidth = size == null ? 75 : Math.max(10, Math.min(75, size.columns - 5));
    const sameLineTextWidth = 6 + (lengthText.length * 2) + state.length.toString().length * 2;
    const totalBars = Math.max(1, maxWidth - sameLineTextWidth);
    const completedBars = Math.floor(totalBars * percent);
    let secondLine = "";

    secondLine += "[";
    if (completedBars != totalBars) {
      if (completedBars > 0) {
        secondLine += colors.cyan("#".repeat(completedBars - 1) + ">");
      }
      secondLine += colors.blue("-".repeat(totalBars - completedBars));
    } else {
      secondLine += colors.cyan("#".repeat(completedBars));
    }
    secondLine += `] (${currentPosText}/${lengthText})`;

    const result = [];
    if (firstLine.length > 0) {
      result.push(firstLine);
    }
    result.push(secondLine);
    return result;
  }
}
