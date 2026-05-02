import $ from "../../mod.ts";

// $.select prompts for one value from a list — arrow keys to move,
// Enter to pick. Returns a SelectionItem with `index` and `value`.
const colour = await $.select({
  message: "What's your favourite colour?",
  options: ["Red", "Green", "Blue", "Yellow", "Purple"],
});

$.logStep("Picked", colour.value);
