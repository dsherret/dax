import { isOutputTty } from "./utils.ts";
import { type ConsoleSize, renderInterval, staticText, type TextItem } from "@david/console-static-text";

const staticTextScope = staticText.createScope();
const _renderScope = renderInterval.start();

export enum LoggerRefreshItemKind {
  ProgressBars,
  Selection,
}

const refreshItems: Record<LoggerRefreshItemKind, TextItem[] | undefined> = {
  [LoggerRefreshItemKind.ProgressBars]: undefined,
  [LoggerRefreshItemKind.Selection]: undefined,
};

function setItems(kind: LoggerRefreshItemKind, items: TextItem[] | undefined, size?: ConsoleSize) {
  refreshItems[kind] = items;
  refresh(size);
}

function refresh(size?: ConsoleSize) {
  if (!isOutputTty) {
    return;
  }
  const items = Object.values(refreshItems).flatMap((items) => items ?? []);
  staticTextScope.setText(items);
  staticText.refresh(size);
}

const logger = {
  setItems,
  logOnce(items: TextItem[], size?: ConsoleSize) {
    staticTextScope.logAbove(items, size);
  },
  withTempClear(action: () => void) {
    staticText.withTempClear(action);
  },
};

export { logger };
