import { colors } from "../../deps.ts";
import { addProgressBar, DrawIntervalProgressBar, removeProgressBar } from "./interval.ts";

export interface ProgressOptions {
  prefix?: string;
  message?: string;
  length?: number;
}

export class ProgressBar {
  #state: {
    message: string | undefined;
    prefix: string | undefined;
    length: number | undefined;
    currentPos: number;
  };
  #pb: DrawIntervalProgressBar;
  #withCount = 0;

  constructor(opts: ProgressOptions) {
    this.#state = {
      message: opts.message,
      prefix: opts.prefix,
      length: opts.length,
      currentPos: 0,
    };
    const tickStrings = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
    let i = 0;
    this.#pb = addProgressBar((size) => {
      if (this.#state.length == null || this.#state.length === 0) {
        i = (i + 1) % tickStrings.length;
        let text = "";
        if (this.#state.prefix != null) {
          text += `${colors.green(this.#state.prefix)} `;
        }
        text += colors.green(tickStrings[i]);
        if (this.#state.message != null) {
          text += ` ${this.#state.message}`;
        }
        return [text];
      } else {
        let firstLine = "";
        if (this.#state.prefix != null) {
          firstLine += colors.green(this.#state.prefix);
        }
        if (this.#state.message != null) {
          if (firstLine.length > 0) {
            firstLine += " ";
          }
          firstLine += this.#state.message;
        }
        const percent = Math.min(this.#state.currentPos / this.#state.length, 1);
        const maxWidth = Math.max(10, Math.min(75, size.columns - 5));
        const sameLineTextWidth = 6 + this.#state.length.toString().length * 2;
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
        secondLine += `] (${this.#state.currentPos}/${this.#state.length})`;

        return [firstLine, secondLine];
      }
    });
  }

  setPrefix(prefix: string | undefined) {
    this.#state.prefix = prefix;
  }

  setMessage(message: string | undefined) {
    this.#state.message = message;
  }

  setPosition(position: number) {
    this.#state.currentPos = position;
  }

  setLength(size: number | undefined) {
    this.#state.length = size;
  }

  finish() {
    removeProgressBar(this.#pb);
  }

  async with(action: () => Promise<void>) {
    this.#withCount++;
    try {
      await action();
    } finally {
      this.#withCount--;
      if (this.#withCount === 0) {
        this.finish();
      }
    }
  }
}

export function progress(opts: ProgressOptions) {
  return new ProgressBar(opts);
}
