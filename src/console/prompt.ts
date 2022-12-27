import { colors } from "../deps.ts";
import { logger, LoggerRefreshItemKind } from "./logger.ts";
import { ensureSingleSelection, ensureTty, Keys, readKeys, TextItem } from "./utils.ts";

/** Options for showing an input where the user enters a value. */
export interface PromptOptions {
  /** Message to display to the user. */
  message: string;
  /**
   * Default value.
   */
  default?: string;
}

export function prompt(optsOrMessage: PromptOptions | string) {
  const opts = typeof optsOrMessage === "string"
    ? {
      message: optsOrMessage,
    }
    : optsOrMessage;
  ensureTty(opts.message);

  const drawState: DrawState = {
    title: opts.message,
    inputText: opts.default ?? "",
  };

  return ensureSingleSelection(async () => {
    await refresh();

    for await (const key of readKeys()) {
      if (typeof key === "string") {
        drawState.inputText += key;
      }
      switch (key) {
        case Keys.Space:
          drawState.inputText += " ";
          break;
        case Keys.Backspace:
          drawState.inputText = drawState.inputText.slice(0, -1);
          break;
        case Keys.Enter:
          await logger.setItems(LoggerRefreshItemKind.Selection, []);
          return drawState.inputText;
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
  inputText: string;
}

function render(state: DrawState): TextItem[] {
  return [
    colors.bold(colors.blue(state.title)) +
    " " +
    state.inputText +
    "\u2588", // (block character)
  ];
}
