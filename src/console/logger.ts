import { ConsoleSize, getStaticText, getStaticTextIfCreated, TextItem } from "./utils.ts";

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
  return refresh(size);
}

async function refresh(size?: ConsoleSize) {
  const staticText = await getStaticText();
  refreshWithStaticText(staticText, size);
}

function refreshWithStaticText(staticText: Awaited<ReturnType<typeof getStaticText>>, size?: ConsoleSize) {
  const items = Object.values(refreshItems).flatMap((items) => items ?? []);
  staticText.set(items, size);
}

function logAboveStaticText(inner: () => void, providedSize?: ConsoleSize) {
  const staticText = getStaticTextIfCreated();
  const size = staticText == null ? undefined : providedSize ?? Deno.consoleSize();
  if (staticText != null) {
    staticText.clear(size);
  }
  inner();
  if (staticText != null) {
    refreshWithStaticText(staticText, size);
  }
}

async function renderOnce(items: TextItem[], size?: ConsoleSize) {
  const staticText = await getStaticText();
  logAboveStaticText(() => {
    staticText.renderOnce(items, size);
  }, size);
}

const logger = {
  setItems,
  renderOnce,
  logAboveStaticText,
};

export { logger };
