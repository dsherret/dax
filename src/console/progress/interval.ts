import { logger, LoggerRefreshItemKind } from "../logger.ts";
import { ConsoleSize, isOutputTty, TextItem } from "../utils.ts";

export interface RenderIntervalProgressBar {
  render(size: ConsoleSize): TextItem[];
}

const intervalMs = 60;
const progressBars: RenderIntervalProgressBar[] = [];
let renderIntervalId: number | undefined;

export function addProgressBar(render: (size: ConsoleSize) => TextItem[]): RenderIntervalProgressBar {
  const pb = {
    render,
  };
  progressBars.push(pb);
  if (renderIntervalId == null && isOutputTty) {
    const _ignore = logger.ensureInitialized()
      .catch(() => {/* ignore */});
    renderIntervalId = setInterval(forceRenderSync, intervalMs);
  }
  return pb;
}

export function removeProgressBar(pb: RenderIntervalProgressBar) {
  const index = progressBars.indexOf(pb);
  if (index === -1) {
    return false;
  }
  progressBars.splice(index, 1);
  if (progressBars.length === 0) {
    clearInterval(renderIntervalId);
    logger.setItems(LoggerRefreshItemKind.ProgressBars, []);
    renderIntervalId = undefined;
  }
  return true;
}

export function forceRender() {
  if (!isShowingProgressBars()) {
    return;
  }

  if (logger.isInitilaized()) {
    forceRenderSync();
    return Promise.resolve();
  } else {
    return logger.ensureInitialized().then(() => {
      forceRenderSync();
    });
  }
}

function forceRenderSync() {
  if (!isShowingProgressBars()) {
    return;
  }

  const size = Deno.consoleSize();
  const items = progressBars.map((p) => p.render(size)).flat();
  logger.setItems(LoggerRefreshItemKind.ProgressBars, items, size);
}

export function isShowingProgressBars() {
  return isOutputTty && progressBars.length > 0;
}
