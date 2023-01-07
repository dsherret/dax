import { ConsoleSize, isOutputTty, safeConsoleSize, staticText, TextItem } from "./utils.ts";

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
  staticText.set(items, size);
}

function logAboveStaticText(inner: () => void, providedSize?: ConsoleSize) {
  if (!isOutputTty) {
    inner();
    return;
  }

  const size = providedSize ?? safeConsoleSize();
  if (size != null) {
    staticText.clear(size);
  }
  inner();
  refresh(size);
}

function logOnce(items: TextItem[], size?: ConsoleSize) {
  logAboveStaticText(() => {
    staticText.outputItems(items, size);
  }, size);
}

const logger = {
  setItems,
  logOnce,
  logAboveStaticText,
};

export { logger };
