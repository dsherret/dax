import * as colors from "@std/fmt/colors";
import { createSelection, Keys, resultOrExit, type SelectionOptions, type TextItem } from "./utils.ts";

/** Options for showing an input where the user enters a value. */
export interface PromptOptions {
  /** Message to display to the user. */
  message: string;
  /**
   * Default value.
   */
  default?: string;
  /**
   * Whether typed characters should be hidden by
   * a mask, optionally allowing a choice of mask
   * character (`*` by default) and whether or not
   * to keep the final character visible as the user
   * types (`false` by default).
   * @default `false`
   */
  mask?: PromptInputMask | boolean;
  /**
   * Whether to not clear the prompt text on selection.
   * @default `false`
   */
  noClear?: boolean;
}

/** Configuration of the prompt input mask */
export interface PromptInputMask {
  /** The character used to mask input (`*` by default) */
  char?: string;
  /** Whether or not to keep the last character "unmasked" (`false` by default) */
  lastVisible?: boolean;
}

const defaultMask: Required<PromptInputMask> = { char: "*", lastVisible: false };

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
  let mask = opts.mask ?? false;
  if (mask && typeof mask === "boolean") {
    mask = defaultMask;
  }

  const drawState: DrawState = {
    title: opts.message,
    inputText: opts.default ?? "",
    mask,
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
  mask: PromptInputMask | false;
  hasCompleted: boolean;
}

function render(state: DrawState): TextItem[] {
  let { inputText } = state;
  if (state.mask) {
    const char = state.mask.char ?? defaultMask.char;
    const lastVisible = state.mask.lastVisible ?? defaultMask.lastVisible;

    const shouldShowLast = lastVisible && !state.hasCompleted;
    const safeLengthMinusOne = Math.max(0, inputText.length - 1);

    const masked = char.repeat(shouldShowLast ? safeLengthMinusOne : inputText.length);
    const unmasked = shouldShowLast ? inputText.slice(safeLengthMinusOne) : "";

    inputText = `${masked}${unmasked}`;
  }

  return [
    colors.bold(colors.blue(state.title))
    + " "
    + inputText
    + (state.hasCompleted ? "" : "\u2588"), // (block character)
  ];
}
