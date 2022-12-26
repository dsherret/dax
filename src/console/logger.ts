import { ConsoleSize, getStaticText, getStaticTextIfCreated, TextItem } from "./utils.ts";

export enum LoggerRefreshItemKind {
  ProgressBars,
  Selection,
}

const refreshItems: Record<LoggerRefreshItemKind, TextItem[] | undefined> = {
  [LoggerRefreshItemKind.ProgressBars]: undefined,
  [LoggerRefreshItemKind.Selection]: undefined,
};

function setItems(kind: LoggerRefreshItemKind, items: TextItem[] | undefined) {
  refreshItems[kind] = items;
  return refresh();
}

async function refresh() {
  const staticText = await getStaticText();
  refreshWithStaticText(staticText);
}

function refreshWithStaticText(staticText: Awaited<ReturnType<typeof getStaticText>>, size?: ConsoleSize) {
  const items = Object.values(refreshItems).flatMap((items) => items ?? []);
  staticText.set(items, size);
}

function logAboveStaticText(inner: () => void) {
  const staticText = getStaticTextIfCreated();
  const size = staticText == null ? undefined : Deno.consoleSize();
  if (staticText != null) {
    staticText.clear(size);
  }
  inner();
  if (staticText != null) {
    refreshWithStaticText(staticText, size);
  }
}

const logger = {
  setItems,
  logAboveStaticText,
};

export { logger };
