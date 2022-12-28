import { logger, LoggerRefreshItemKind } from "../logger.ts";
import { ConsoleSize, safeConsoleSize, TextItem } from "../utils.ts";

export interface DrawIntervalProgressBar {
  render(size: ConsoleSize): TextItem[];
}

const isEnabled = Deno.isatty(Deno.stdin.rid) && safeConsoleSize() != null;
let drawIntervalId: number | undefined;
const progressBars: DrawIntervalProgressBar[] = [];

export function addProgressBar(render: (size: ConsoleSize) => TextItem[]): DrawIntervalProgressBar {
  const pb = {
    render,
  };
  progressBars.push(pb);
  if (drawIntervalId == null && isEnabled) {
    drawIntervalId = setInterval(draw, 60);
  }
  return pb;
}

export function removeProgressBar(pb: DrawIntervalProgressBar) {
  const index = progressBars.indexOf(pb);
  if (index >= 0) {
    progressBars.splice(index, 1);
    if (progressBars.length === 0) {
      clearInterval(drawIntervalId);
      logger.setItems(LoggerRefreshItemKind.ProgressBars, []);
      drawIntervalId = undefined;
    }
  }
}

function draw() {
  if (!isEnabled || progressBars.length === 0) {
    return;
  }

  const size = Deno.consoleSize();
  const items = progressBars.map((p) => p.render(size)).flat();
  logger.setItems(LoggerRefreshItemKind.ProgressBars, items, size);
}
