import { renderTextItems, stripAnsiCodes } from "@david/console-static-text";
import type { Keys, SelectionOptions } from "./utils.ts";

export function createTester<TReturn>(
  renderer: Pick<SelectionOptions<TReturn | undefined>, "render" | "onKey">,
) {
  return {
    onKey(key: string | Keys) {
      return renderer.onKey(key);
    },
    getText() {
      const items = renderer.render();
      const text = renderTextItems(items, { columns: 100, rows: 20 });
      return text == null ? undefined : stripAnsiCodes(text);
    },
  };
}
