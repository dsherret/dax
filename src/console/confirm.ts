import { colors } from "../deps.ts";
import { logger, LoggerRefreshItemKind } from "./logger.ts";
import { ensureSingleSelection, ensureTty, Keys, readKeys, TextItem } from "./utils.ts";

/** Options for showing a selection that only has one result. */
export interface ConfirmOptions {
  /** Message to display to the user. */
  message: string;
  /**
   * Default value.
   * @default `false`
   */
  default?: boolean;
}

export function confirm(optsOrMessage: ConfirmOptions | string) {
  const opts = typeof optsOrMessage === "string"
    ? {
      message: optsOrMessage,
    }
    : optsOrMessage;
  ensureTty(opts.message);

  const drawState: DrawState = {
    title: opts.message,
    default: opts.default ?? false,
    inputText: "",
  };

  return ensureSingleSelection(async () => {
    await refresh();

    for await (const key of readKeys()) {
      switch (key) {
        case Keys.Y:
          drawState.inputText = "Y";
          break;
        case Keys.N:
          drawState.inputText = "N";
          break;
        case Keys.Backspace:
          drawState.inputText = "";
          break;
        case Keys.Enter:
          return drawState.inputText === "Y" ? true : drawState.inputText === "N" ? false : drawState.default;
      }

      await refresh();
    }

    await logger.setItems(LoggerRefreshItemKind.Selection, []);
  });

  function refresh() {
    const items = render(drawState);
    return logger.setItems(LoggerRefreshItemKind.Selection, items);
  }
}

interface DrawState {
  title: string;
  default: boolean;
  inputText: string;
}

function render(state: DrawState): TextItem[] {
  return [
    colors.bold(colors.blue(state.title)) +
    " " + (state.default ? "(Y/n)" : "(y/N)") + " " +
    state.inputText +
    "\u2588", // (block character)
  ];
}
