import $ from "../../mod.ts";

// $.multiSelect prompts for zero or more values — arrow keys to move,
// Space to toggle, Enter to submit. Items can start pre-selected.
const days = await $.multiSelect({
  message: "Which of the following are days of the week?",
  options: [
    "Monday",
    {
      text: "Wednesday",
      selected: true,
    },
    "Blue",
    "Friday",
    "Pancakes",
  ],
});

$.log("Picked", days.map((d) => d.value).join(", "));
