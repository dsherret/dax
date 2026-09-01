import process from "node:process";
import { styleText as nodeStyleText } from "node:util";

/** Text format(s) accepted by {@linkcode styleText}. */
export type TextFormat = Parameters<typeof nodeStyleText>[0];

/** Applies ANSI formatting to the provided text.
 *
 * Unlike `node:util`'s `styleText`, this does not validate the output stream
 * because dax writes through configurable loggers rather than always writing
 * to stderr. Formatting is therefore enabled by default and controlled only by
 * the environment: `NO_COLOR` disables it and `FORCE_COLOR` overrides both.
 */
export function styleText(format: TextFormat, text: string): string {
  if (!hasColors()) {
    return text;
  }
  return nodeStyleText(format, text, { validateStream: false });
}

function hasColors() {
  // FORCE_COLOR takes precedence over NO_COLOR in node, so match that here.
  // The values that enable color mirror node's tty.WriteStream#getColorDepth.
  const forceColor = process.env.FORCE_COLOR;
  if (forceColor != null) {
    return forceColor === ""
      || forceColor === "1"
      || forceColor === "2"
      || forceColor === "3"
      || forceColor === "true";
  }
  // per the NO_COLOR spec, only a non-empty value disables color. This is what
  // Deno.noColor does and so matches how @std/fmt/colors previously behaved.
  const noColor = process.env.NO_COLOR;
  return noColor == null || noColor.length === 0;
}
