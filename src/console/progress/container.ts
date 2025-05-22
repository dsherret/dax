import type { ConsoleSize, DeferredItem, TextItem } from "@david/console-static-text";
import { logger, LoggerRefreshItemKind } from "../logger.ts";
import { isOutputTty } from "../utils.ts";

export interface RenderIntervalProgressBar {
  render(size: ConsoleSize | undefined): TextItem[];
}

const progressBars: RenderIntervalProgressBar[] = [];

export function addProgressBar(render: (size: ConsoleSize) => TextItem[]): RenderIntervalProgressBar {
  const pb = {
    render,
  };
  progressBars.push(pb);
  refresh();
  return pb;
}

export function removeProgressBar(pb: RenderIntervalProgressBar) {
  const index = progressBars.indexOf(pb);
  if (index === -1) {
    return false;
  }
  progressBars.splice(index, 1);
  refresh();
  return true;
}

function refresh() {
  logger.setItems(
    LoggerRefreshItemKind.ProgressBars,
    progressBars.map((p) => {
      const item: DeferredItem = (consoleSize) => {
        return p.render(consoleSize);
      };
      return item;
    }),
  );
}

export function isShowingProgressBars() {
  return isOutputTty && progressBars.length > 0;
}
