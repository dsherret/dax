import { colors } from "../deps.ts";
import { logger, LoggerRefreshItemKind } from "./logger.ts";
import { ensureSingleSelection, ensureTty, Keys, readKeys, TextItem } from "./utils.ts";

/** Options for showing a selection that only has one result. */
export interface SelectOptions {
  /** Prompt text to show the user. */
  title: string;
  /** Initial selected option index. Defaults to 0. */
  initialIndex?: number;
  /** Options to show the user. */
  options: string[];
}

export function select(opts: SelectOptions) {
  if (opts.options.length <= 1) {
    throw new Error(`You must provide at least two options. (Prompt: '${opts.title}')`);
  }
  ensureTty(opts.title);

  const drawState: DrawState = {
    title: opts.title,
    activeIndex: (opts.initialIndex ?? 0) % opts.options.length,
    items: opts.options,
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
        case Keys.Enter:
          await logger.setItems(LoggerRefreshItemKind.Selection, []);
          return drawState.activeIndex;
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
  activeIndex: number;
  items: string[];
}

function render(state: DrawState): TextItem[] {
  const items = [];
  items.push(colors.bold(colors.blue(state.title)));
  for (const [i, text] of state.items.entries()) {
    const prefix = i === state.activeIndex ? "> " : "  ";
    items.push({
      text: `${prefix}${text}`,
      indent: 4,
    });
  }
  return items;
}
