import { ConsoleSize, getStaticText, getStaticTextIfCreated, safeConsoleSize, TextItem } from "./utils.ts";

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
  const staticText = getStaticTextIfCreated();
  if (staticText) {
    refreshWithStaticText(staticText, size);
  }
}

function refreshWithStaticText(staticText: Awaited<ReturnType<typeof getStaticText>>, size?: ConsoleSize) {
  const items = Object.values(refreshItems).flatMap((items) => items ?? []);
  staticText.set(items, size);
}

function logAboveStaticText(inner: () => void, providedSize?: ConsoleSize) {
  const staticText = getStaticTextIfCreated();
  const size = staticText == null ? undefined : providedSize ?? safeConsoleSize();
  if (staticText != null && size != null) {
    staticText.clear(size);
  }
  inner();
  if (staticText != null && size != null) {
    refreshWithStaticText(staticText, size);
  }
}

async function logOnce(items: TextItem[], size?: ConsoleSize) {
  const staticText = await getStaticText();
  logAboveStaticText(() => {
    staticText.outputItems(items, size);
  }, size);
}

async function ensureInitialized() {
  await getStaticText();
}

function isInitilaized() {
  return getStaticTextIfCreated() != null;
}

const logger = {
  ensureInitialized,
  isInitilaized,
  setItems,
  logOnce,
  logAboveStaticText,
};

export { logger };
