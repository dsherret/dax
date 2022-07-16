import { colors } from "./deps.ts";

export interface PromptSelectOptions {
  title: string;
  options: string[];
}

promptSelect({
  title: "test",
  options: ["test"],
});

export function promptSelect(opts: PromptSelectOptions) {
  if (opts.options.length === 0) {
    throw new Error(`You must provide at least one option. (Prompt: '${opts.title}')`);
  }
  if (!Deno.isatty(Deno.stdin.rid)) {
    throw new Error(`Cannot prompt when not a tty. (Prompt: '${opts.title}')`);
  }
  const encoder = new TextEncoder();

  while (true) {
    const buf = new Uint8Array(1);
    const result = Deno.readSync(Deno.stdin.rid, buf);
    console.log(buf);
  }

  function saveCursor() {
    Deno.stderr.writeSync(encoder.encode("\x1B[s"));
  }
  function restoreCursor() {
    Deno.stderr.writeSync(encoder.encode("\x1B[u"));
  }
}

interface DrawState {
  title: string;
  items: ItemDrawState[];
}

interface ItemDrawState {
  selected: boolean;
  text: string;
}

function draw(state: DrawState) {
  console.error(colors.bold(state.title));
  for (const item of state.items) {
    console.error(`[${item.selected ? "x" : " "}] ${item.text}`);
  }
}
