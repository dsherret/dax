import { colors } from "../deps.ts";
import { createSelection, Keys, TextItem } from "./utils.ts";

/** Options for showing confirming a yes or no question. */
export interface ConfirmOptions {
  /** Message to display to the user. */
  message: string;
  /**
   * Default value.
   * @default `false`
   */
  default?: boolean;
  /**
   * Whether to not clear the prompt text on selection.
   * @default `false`
   */
  noClear?: boolean;
}

export function confirm(optsOrMessage: ConfirmOptions | string) {
  const opts = typeof optsOrMessage === "string"
    ? {
      message: optsOrMessage,
    }
    : optsOrMessage;

  const drawState: DrawState = {
    title: opts.message,
    default: opts.default ?? false,
    inputText: "",
    hasSelected: false,
  };

  return createSelection({
    message: opts.message,
    noClear: opts.noClear,
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
          drawState.hasSelected = true;
          if (drawState.inputText.length === 0) {
            drawState.inputText = drawState.default ? "Y" : "N";
          }
          return drawState.inputText === "Y" ? true : drawState.inputText === "N" ? false : drawState.default;
      }
    },
  });
}

interface DrawState {
  title: string;
  default: boolean;
  inputText: string;
  hasSelected: boolean;
}

function render(state: DrawState): TextItem[] {
  return [
    colors.bold(colors.blue(state.title)) +
    " " + (state.default ? "(Y/n)" : "(y/N)") + " " +
    state.inputText +
    (state.hasSelected ? "" : "\u2588"), // (block character)
  ];
}
