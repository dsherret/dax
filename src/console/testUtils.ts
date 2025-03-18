import { static_text_render_once, strip_ansi_codes } from "../lib/rs_lib.js";
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
      const text = static_text_render_once(items, 100, 20);
      return text == null ? undefined : strip_ansi_codes(text);
    },
  };
}
