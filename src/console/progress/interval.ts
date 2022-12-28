import { logger, LoggerRefreshItemKind } from "../logger.ts";
import { ConsoleSize, safeConsoleSize, TextItem } from "../utils.ts";

export interface RenderIntervalProgressBar {
  render(size: ConsoleSize): TextItem[];
}

const isEnabled = Deno.isatty(Deno.stdin.rid) && safeConsoleSize() != null;
const intervalMs = 60;
const progressBars: RenderIntervalProgressBar[] = [];
let renderIntervalId: number | undefined;
let lastRenderTime = Date.now();

export function addProgressBar(render: (size: ConsoleSize) => TextItem[]): RenderIntervalProgressBar {
  const pb = {
    render,
  };
  progressBars.push(pb);
  if (renderIntervalId == null && isEnabled) {
    renderIntervalId = setInterval(forceRender, intervalMs);
  }
  return pb;
}

export function removeProgressBar(pb: RenderIntervalProgressBar) {
  const index = progressBars.indexOf(pb);
  if (index >= 0) {
    progressBars.splice(index, 1);
    if (progressBars.length === 0) {
      clearInterval(renderIntervalId);
      logger.setItems(LoggerRefreshItemKind.ProgressBars, []);
      renderIntervalId = undefined;
    }
  }
}

export function forceRenderIfHasNotInWhile() {
  const duration = Date.now() - lastRenderTime;
  if (duration > intervalMs * 2) {
    forceRender();
  }
}

export function forceRender() {
  if (!isEnabled || progressBars.length === 0) {
    return;
  }

  const size = Deno.consoleSize();
  const items = progressBars.map((p) => p.render(size)).flat();
  logger.setItems(LoggerRefreshItemKind.ProgressBars, items, size);
  lastRenderTime = Date.now();
}
