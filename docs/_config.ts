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

export default site;
