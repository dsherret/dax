import { colors } from "../deps.ts";
import { createSelection, Keys, TextItem } from "./utils.ts";

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

export function confirm(optsOrMessage: ConfirmOptions | string) {
  return maybeConfirm(optsOrMessage).then((result) => {
    if (result == null) {
      Deno.exit(130);
    } else {
      return result;
    }
  });
}

export function maybeConfirm(optsOrMessage: ConfirmOptions | string) {
  const opts = typeof optsOrMessage === "string"
    ? {
      message: optsOrMessage,
    }
    : optsOrMessage;

  const drawState: DrawState = {
    title: opts.message,
    default: opts.default,
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
          if (drawState.inputText.length === 0) {
            if (drawState.default == null) {
              return undefined; // do nothing
            }

            drawState.inputText = drawState.default ? "Y" : "N";
          }
          drawState.hasSelected = true;
          return drawState.inputText === "Y" ? true : drawState.inputText === "N" ? false : drawState.default;
      }
    },
  });
}

interface DrawState {
  title: string;
  default: boolean | undefined;
  inputText: string;
  hasSelected: boolean;
}

function render(state: DrawState): TextItem[] {
  return [
    colors.bold(colors.blue(state.title)) +
    " " + (state.default == null ? "" : state.default ? "(Y/n) " : "(y/N) ") +
    state.inputText +
    (state.hasSelected ? "" : "\u2588"), // (block character)
  ];
}
