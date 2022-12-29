import { logger, LoggerRefreshItemKind } from "../logger.ts";
import { ConsoleSize, isInteractiveConsole, TextItem } from "../utils.ts";

export interface RenderIntervalProgressBar {
  render(size: ConsoleSize): TextItem[];
}

const intervalMs = 60;
const progressBars: RenderIntervalProgressBar[] = [];
let renderIntervalId: number | undefined;
let lastRenderTime = Date.now();

export function addProgressBar(render: (size: ConsoleSize) => TextItem[]): RenderIntervalProgressBar {
  const pb = {
    render,
  };
  progressBars.push(pb);
  if (renderIntervalId == null && isInteractiveConsole) {
    renderIntervalId = setInterval(forceRender, intervalMs);
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

export function forceRenderIfHasNotInWhile() {
  const duration = Date.now() - lastRenderTime;
  if (duration > intervalMs * 2) {
    forceRender();
  }
}

export function forceRender() {
  if (!isInteractiveConsole || progressBars.length === 0) {
    return;
  }

  const size = Deno.consoleSize();
  const items = progressBars.map((p) => p.render(size)).flat();
  logger.setItems(LoggerRefreshItemKind.ProgressBars, items, size);
  lastRenderTime = Date.now();
}

export function isShowingProgressBars() {
  return isInteractiveConsole && progressBars.length > 0;
}
