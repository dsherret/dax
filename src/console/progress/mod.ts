import { colors } from "../../deps.ts";
import { ConsoleSize, TextItem } from "../utils.ts";
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
}

/** A progress bar instance. Create one of these via `$.progress({ ... })`. */
export class ProgressBar {
  #state: RenderState;
  #pb: RenderIntervalProgressBar;
  #withCount = 0;

  constructor(opts: ProgressOptions) {
    this.#state = {
      message: opts.message,
      prefix: opts.prefix,
      length: opts.length,
      currentPos: 0,
      tickCount: 0,
    };
    this.#pb = addProgressBar((size) => {
      this.#state.tickCount++;
      return renderProgressBar(this.#state, size);
    });
  }

  /** Sets the prefix message/word, which will be displayed in green. */
  setPrefix(prefix: string | undefined) {
    this.#state.prefix = prefix;
    forceRenderIfHasNotInWhile();
  }

  /** Sets the message the progress bar will display after the prefix in white. */
  setMessage(message: string | undefined) {
    this.#state.message = message;
    forceRenderIfHasNotInWhile();
  }

  /** Sets the current position of the progress bar. */
  setPosition(position: number) {
    this.#state.currentPos = position;
    forceRenderIfHasNotInWhile();
  }

  /** Increments the position of the progress bar. */
  increment() {
    this.#state.currentPos++;
    forceRenderIfHasNotInWhile();
  }

  /** Sets the total length of the progress bar. */
  setLength(size: number | undefined) {
    this.#state.length = size;
    forceRenderIfHasNotInWhile();
  }

  /** Forces a render to the console. */
  forceRender() {
    forceRender();
  }

  /** Finish showing the progress bar. */
  finish() {
    removeProgressBar(this.#pb);
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

export function progress(opts: ProgressOptions) {
  return new ProgressBar(opts);
}

interface RenderState {
  message: string | undefined;
  prefix: string | undefined;
  length: number | undefined;
  currentPos: number;
  tickCount: number;
}

export function renderProgressBar(state: RenderState, size: ConsoleSize): TextItem[] {
  if (state.length == null || state.length === 0) {
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
    const maxWidth = Math.max(10, Math.min(75, size.columns - 5));
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
      secondLine += colors.blue("#".repeat(completedBars));
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
