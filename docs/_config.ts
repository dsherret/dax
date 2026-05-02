import lume from "lume/mod.ts";
import codeHighlight from "lume/plugins/code_highlight.ts";
import lang_typescript from "npm:highlight.js/lib/languages/typescript";
import lang_bash from "npm:highlight.js/lib/languages/bash";

const site = lume({}, {
  markdown: {
    options: {
      html: true,
    },
  },
});

site.use(codeHighlight({
  languages: {
    typescript: lang_typescript,
    ts: lang_typescript,
    bash: lang_bash,
    sh: lang_bash,
  },
}));

site.remoteFile("logo.svg", import.meta.resolve("../src/assets/logo.svg"));
site.copy("logo.svg");
site.copy("styles.css");
site.copy("script.js");

site.copy("videos/output", "videos");

// resolve the version once at build time from the latest git tag and substitute
// `{{ version }}` placeholders in rendered html. lets the hero ride along with
// releases without anyone having to hand-edit the docs on every tag.
const version = await (async () => {
  const cmd = new Deno.Command("git", {
    args: ["describe", "--tags", "--abbrev=0"],
    cwd: import.meta.dirname,
    stdout: "piped",
    stderr: "piped",
  });
  const result = await cmd.output();
  if (!result.success) throw new Error("could not read latest git tag for docs version");
  return "v" + new TextDecoder().decode(result.stdout).trim();
})();
site.process([".html"], (pages) => {
  for (const page of pages) {
    page.content = (page.content as string).replaceAll("{{ version }}", version);
  }
});

// validate that the sidebar in _data.yml stays in sync with the page's h2/section ids.
// fails the build if a sidebar entry points at a missing id, or if a page heading
// has no sidebar entry — so adding/renaming a section forces a sidebar update.
site.process([".html"], (pages) => {
  for (const page of pages) {
    if (page.data.url !== "/") continue;
    const html = page.content as string;
    const pageIds = new Set([
      ...[...html.matchAll(/<h2[^>]*\sid="([^"]+)"/g)].map((m) => m[1]),
      ...[...html.matchAll(/<section[^>]*\sid="([^"]+)"/g)].map((m) => m[1]),
    ]);
    const sidebar = page.data.sidebar as { heading: string; items: { title: string; href: string }[] }[];
    const sidebarIds = sidebar.flatMap((g) => g.items.map((i) => i.href.replace(/^#/, "")));

    const missing = sidebarIds.filter((id) => !pageIds.has(id));
    const extra = [...pageIds].filter((id) => !sidebarIds.includes(id) && id !== "top");

    const errors: string[] = [];
    if (missing.length) errors.push(`sidebar references ids not in the page: ${missing.join(", ")}`);
    if (extra.length) errors.push(`page has ids with no sidebar entry: ${extra.join(", ")}`);
    if (errors.length) throw new Error(`docs sidebar out of sync\n  - ${errors.join("\n  - ")}`);
  }
});

export default site;
