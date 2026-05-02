// Regenerates the .mp4 for every .tape file in this directory.
// Requires `vhs` on PATH — see https://github.com/charmbracelet/vhs#installation
import $, { type Path } from "../../mod.ts";

const here = $.path(import.meta.dirname!);

if (!(await $.commandExists("vhs"))) {
  $.logError("error", "vhs is not on PATH. Install: https://github.com/charmbracelet/vhs#installation");
  Deno.exit(1);
}

await here.join("output").mkdir({ recursive: true });

const filter = Deno.args[0];
const tapes: Path[] = [];
for (const entry of here.readDirSync()) {
  if (!entry.isFile || !entry.name.endsWith(".tape")) continue;
  if (filter && !entry.name.includes(filter)) continue;
  tapes.push(entry.path);
}
tapes.sort();

if (tapes.length === 0) {
  $.logWarn("No matching tapes.");
  Deno.exit(0);
}

await Promise.all(tapes.map(async (tape) => {
  await $`vhs ${tape}`
    .tailDisplay({ maxLines: 3 })
    .cwd(here);
}));

$.logStep("Done.", `Wrote ${tapes.length} mp4(s) to ${here.join("output")}`);
