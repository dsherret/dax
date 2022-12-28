import { colors } from "../../deps.ts";
import { ConsoleSize, isInteractiveConsole, safeConsoleSize, TextItem } from "../utils.ts";
import {
  addProgressBar,
  forceRender,
  forceRenderIfHasNotInWhile,
  removeProgressBar,
  RenderIntervalProgressBar,
} from "./interval.ts";

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

/** A progress bar instance. Create one of these via `$.progress({ ... })`. */
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
    };
    this.#pb = addProgressBar((size) => {
      this.#state.tickCount++;
      return renderProgressBar(this.#state, size);
    });
    this.#noClear = opts.noClear ?? false;

    this.#logIfNonInteractive();
  }

  /** Sets the prefix message/word, which will be displayed in green. */
  prefix(prefix: string | undefined) {
    this.#state.prefix = prefix;
    forceRenderIfHasNotInWhile();
    if (prefix != null && prefix.length > 0) {
      this.#logIfNonInteractive();
    }
    return this;
  }

  /** Sets the message the progress bar will display after the prefix in white. */
  message(message: string | undefined) {
    this.#state.message = message;
    forceRenderIfHasNotInWhile();

    if (message != null && message.length > 0) {
      this.#logIfNonInteractive();
    }
    return this;
  }

  #logIfNonInteractive() {
    if (isInteractiveConsole) {
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
  position(position: number) {
    this.#state.currentPos = position;
    forceRenderIfHasNotInWhile();
    return this;
  }

  /** Increments the position of the progress bar. */
  increment() {
    this.#state.currentPos++;
    forceRenderIfHasNotInWhile();
    return this;
  }

  /** Sets the total length of the progress bar. */
  length(size: number | undefined) {
    this.#state.length = size;
    forceRenderIfHasNotInWhile();
    return this;
  }

  /** Whether the progress bar should output a summary when finished. */
  noClear(value = true) {
    this.#noClear = value;
    return this;
  }

  /** Forces a render to the console. */
  forceRender() {
    forceRender();
  }

  /** Finish showing the progress bar. */
  finish() {
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

  /**
   * Does the provided action and will call `.finish()` when this is the last `.with(...)` action that runs.
   *
   * Since this is the synchronous overload, you should probably call `.forceRender()` to force rendering
   * every now and again.
   */
  with<TResult>(action: () => TResult): TResult;
  /** Does the provided action and will call `.finish()` when this is the last `.with(...)` action that runs. */
  with<TResult>(action: () => Promise<TResult>): Promise<TResult>;
  with<TResult>(action: () => Promise<TResult> | TResult) {
    this.#withCount++;
    let wasAsync = false;
    try {
      const result = action();
      if (result instanceof Promise) {
        wasAsync = true;
        return result.finally(() => {
          this.#decrementWithCount();
        });
      } else {
        return result;
      }
    } finally {
      if (!wasAsync) {
        this.#decrementWithCount();
      }
    }
  }

  #decrementWithCount() {
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
}

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
    const tickStrings = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
    let text = "";
    if (state.prefix != null) {
      text += `${colors.green(state.prefix)} `;
    }
    text += colors.green(tickStrings[Math.abs(state.tickCount) % tickStrings.length]);
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
    const maxWidth = size == null ? 75 : Math.max(10, Math.min(75, size.columns - 5));
    const sameLineTextWidth = 6 + state.length.toString().length * 2;
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
    secondLine += `] (${state.currentPos}/${state.length})`;

    const result = [];
    if (firstLine.length > 0) {
      result.push(firstLine);
    }
    result.push(secondLine);
    return result;
  }
}
