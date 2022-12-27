import { colors } from "../deps.ts";
import { logger, LoggerRefreshItemKind } from "./logger.ts";
import { ensureSingleSelection, ensureTty, Keys, readKeys, TextItem } from "./utils.ts";

/** Single options within a multi-select option. */
export interface MultiSelectOption {
  /** Text to display for this option. */
  text: string;
  /** Whether it is selected by default. */
  selected?: boolean;
}

/** Options for showing a selection that has multiple possible values. */
export interface MultiSelectOptions {
  /** Prompt text to show the user. */
  message: string;
  /** Options to show the user. */
  options: (string | MultiSelectOption)[];
}

export function multiSelect(opts: MultiSelectOptions) {
  if (opts.options.length === 0) {
    throw new Error(`You must provide at least one option. (Prompt: '${opts.message}')`);
  }
  ensureTty(opts.message);

  const drawState: DrawState = {
    title: opts.message,
    activeIndex: 0,
    items: opts.options.map((option) => {
      if (typeof option === "string") {
        option = {
          text: option,
        };
      }
      return {
        selected: option.selected ?? false,
        text: option.text,
      };
    }),
  };

  return ensureSingleSelection(async () => {
    await refresh();

    for await (const key of readKeys()) {
      switch (key) {
        case Keys.Up:
          if (drawState.activeIndex === 0) {
            drawState.activeIndex = drawState.items.length - 1;
          } else {
            drawState.activeIndex--;
          }
          break;
        case Keys.Down:
          drawState.activeIndex = (drawState.activeIndex + 1) % drawState.items.length;
          break;
        case Keys.Space: {
          const item = drawState.items[drawState.activeIndex];
          item.selected = !item.selected;
          break;
        }
        case Keys.Enter:
          await logger.setItems(LoggerRefreshItemKind.Selection, []);
          return drawState
            .items
            .map((value, index) => [value, index] as const)
            .filter(([value]) => value.selected)
            .map(([, index]) => index);
      }

      await refresh();
    }
  });

  function refresh() {
    const items = render(drawState);
    return logger.setItems(LoggerRefreshItemKind.Selection, items);
  }
}

interface DrawState {
  title: string;
  activeIndex: number;
  items: ItemDrawState[];
}

interface ItemDrawState {
  selected: boolean;
  text: string;
}

function render(state: DrawState): TextItem[] {
  const items = [];
  items.push(colors.bold(colors.blue(state.title)));
  for (const [i, item] of state.items.entries()) {
    const prefix = i === state.activeIndex ? "> " : "  ";
    items.push({
      text: `${prefix}[${item.selected ? "x" : " "}] ${item.text}`,
      indent: 6,
    });
  }
  return items;
}
