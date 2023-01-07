import { colors } from "../deps.ts";
import { createSelection, Keys, resultOrExit, SelectionOptions, TextItem } from "./utils.ts";

/** Options for showing an input where the user enters a value. */
export interface PromptOptions {
  /** Message to display to the user. */
  message: string;
  /**
   * Default value.
   */
  default?: string;
  /**
   * Whether to not clear the prompt text on selection.
   * @default `false`
   */
  noClear?: boolean;
}

export function prompt(optsOrMessage: PromptOptions | string, options?: Omit<PromptOptions, "message">) {
  return maybePrompt(optsOrMessage, options).then(resultOrExit);
}

export function maybePrompt(optsOrMessage: PromptOptions | string, options?: Omit<PromptOptions, "message">) {
  const opts = typeof optsOrMessage === "string"
    ? {
      message: optsOrMessage,
      ...options,
    }
    : optsOrMessage;

  return createSelection({
    message: opts.message,
    noClear: opts.noClear,
    ...innerPrompt(opts),
  });
}

export function innerPrompt(
  opts: PromptOptions,
): Pick<SelectionOptions<string | undefined>, "render" | "onKey"> {
  const drawState: DrawState = {
    title: opts.message,
    inputText: opts.default ?? "",
    hasCompleted: false,
  };

  return {
    render: () => render(drawState),
    onKey: (key) => {
      if (typeof key === "string") {
        drawState.inputText += key;
      } else {
        switch (key) {
          case Keys.Space:
            drawState.inputText += " ";
            break;
          case Keys.Backspace:
            drawState.inputText = drawState.inputText.slice(0, -1);
            break;
          case Keys.Enter:
            drawState.hasCompleted = true;
            return drawState.inputText;
        }
      }
      return undefined;
    },
  };
}

interface DrawState {
  title: string;
  inputText: string;
  hasCompleted: boolean;
}

function render(state: DrawState): TextItem[] {
  return [
    colors.bold(colors.blue(state.title)) +
    " " +
    state.inputText +
    (state.hasCompleted ? "" : "\u2588"), // (block character)
  ];
}
