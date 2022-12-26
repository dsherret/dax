import { colors } from "../deps.ts";
import { logger, LoggerRefreshItemKind } from "./logger.ts";
import { ensureTty, hideCursor, Key, readKeys, showCursor, TextItem } from "./utils.ts";

export interface MultiSelectOption {
  text: string;
  selected?: boolean;
}

export interface MultiSelectOptions {
  title: string;
  options: (string | MultiSelectOption)[];
}

export async function multiSelect(opts: MultiSelectOptions) {
  if (opts.options.length === 0) {
    throw new Error(`You must provide at least one option. (Prompt: '${opts.title}')`);
  }
  ensureTty(opts.title);

  const drawState: DrawState = {
    title: opts.title,
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

  await hideCursor();
  try {
    await refresh();

    for await (const key of readKeys()) {
      switch (key) {
        case Key.Up:
          if (drawState.activeIndex === 0) {
            drawState.activeIndex = drawState.items.length - 1;
          } else {
            drawState.activeIndex--;
          }
          break;
        case Key.Down:
          drawState.activeIndex = (drawState.activeIndex + 1) % drawState.items.length;
          break;
        case Key.Space: {
          const item = drawState.items[drawState.activeIndex];
          item.selected = !item.selected;
          break;
        }
        case Key.Enter:
          await logger.setItems(LoggerRefreshItemKind.Selection, []);
          return drawState
            .items
            .map((value, index) => [value, index] as const)
            .filter(([value]) => value.selected)
            .map(([, index]) => index);
      }

      await refresh();
    }

    await logger.setItems(LoggerRefreshItemKind.Selection, []);
  } finally {
    await showCursor();
    Deno.stdin.setRaw(false);
  }

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
