import * as colors from "@std/fmt/colors";
import { createSelection, Keys, resultOrExit, type SelectionOptions } from "./utils.ts";
import type { TextItem } from "@david/console-static-text";

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

export function confirm(optsOrMessage: ConfirmOptions | string, options?: Omit<ConfirmOptions, "message">) {
  return maybeConfirm(optsOrMessage, options).then(resultOrExit);
}

export function maybeConfirm(optsOrMessage: ConfirmOptions | string, options?: Omit<ConfirmOptions, "message">) {
  const opts = typeof optsOrMessage === "string" ? { message: optsOrMessage, ...options } : optsOrMessage;

  return createSelection({
    message: opts.message,
    noClear: opts.noClear,
    ...innerConfirm(opts),
  });
}

export function innerConfirm(opts: ConfirmOptions): Pick<SelectionOptions<boolean | undefined>, "render" | "onKey"> {
  const drawState: DrawState = {
    title: opts.message,
    default: opts.default,
    inputText: "",
    hasCompleted: false,
  };
  return {
    render: () => render(drawState),
    onKey: (key) => {
      switch (key) {
        case "Y":
        case "y":
          drawState.inputText = "Y";
          break;
        case "N":
        case "n":
          drawState.inputText = "N";
          break;
        case Keys.Backspace:
          drawState.inputText = "";
          break;
        case Keys.Enter:
          if (drawState.inputText.length === 0) {
            if (drawState.default == null) {
              return undefined; // do nothing
            }

            drawState.inputText = drawState.default ? "Y" : "N";
          }
          drawState.hasCompleted = true;
          return drawState.inputText === "Y" ? true : drawState.inputText === "N" ? false : drawState.default;
      }
    },
  };
}

interface DrawState {
  title: string;
  default: boolean | undefined;
  inputText: string;
  hasCompleted: boolean;
}

function render(state: DrawState): TextItem[] {
  return [
    colors.bold(colors.blue(state.title))
    + " " + (state.hasCompleted ? "" : state.default == null ? "(Y/N) " : state.default ? "(Y/n) " : "(y/N) ")
    + state.inputText
    + (state.hasCompleted ? "" : "\u2588"), // (block character)
  ];
}
