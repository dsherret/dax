import * as colors from "@std/fmt/colors";
import { createSelection, Keys, resultOrExit, type SelectionOptions } from "./utils.ts";
import type { TextItem } from "@david/console-static-text";

/** Options for showing an alert message. */
export interface AlertOptions {
  /** Message to display to the user. */
  message: string;
  /**
   * Whether the user must press Enter to dismiss the alert.
   * When `false`, any key press dismisses it.
   * @default `false`
   */
  requireEnter?: boolean;
  /**
   * Whether to not clear the prompt text on selection.
   * @default `false`
   */
  noClear?: boolean;
}

export function alert(
  optsOrMessage: AlertOptions | string,
  options?: Omit<AlertOptions, "message">,
): Promise<void> {
  const opts = typeof optsOrMessage === "string" ? { message: optsOrMessage, ...options } : optsOrMessage;

  return createSelection({
    message: opts.message,
    noClear: opts.noClear,
    ...innerAlert(opts),
  }).then(resultOrExit).then(() => undefined);
}

export function innerAlert(opts: AlertOptions): Pick<SelectionOptions<true>, "render" | "onKey"> {
  const requireEnter = opts.requireEnter ?? false;
  const drawState: DrawState = {
    title: opts.message,
    requireEnter,
    hasCompleted: false,
  };
  return {
    render: () => render(drawState),
    onKey: (key) => {
      if (!requireEnter || key === Keys.Enter) {
        drawState.hasCompleted = true;
        return true;
      }
      return undefined;
    },
  };
}

interface DrawState {
  title: string;
  requireEnter: boolean;
  hasCompleted: boolean;
}

function render(state: DrawState): TextItem[] {
  const hint = state.hasCompleted ? "" : state.requireEnter ? " [press enter]" : " [press any key]";
  return [
    colors.bold(colors.blue(state.title)) + colors.dim(hint),
  ];
}
