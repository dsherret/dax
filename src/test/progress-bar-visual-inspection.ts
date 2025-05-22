import { delay } from "@std/async/delay";
import $ from "../../mod.ts";
import { staticText } from "@david/console-static-text";

$.log("Welcome to the visual test of the progress bars.");
$.log("The next item should show a progress bar with a spinner for 1s then hide it.");
await delay(1_000);

let pb = $.progress("Doing action...");

await pb.with(async () => {
  await delay(1_000);
});

$.log("Now the next thing will show multiple pb and a selection and log numbers");
await delay(1_000);

pb = $.progress("Doing next action...");
const pb2 = $.progress("Next one...");

let i = 0;
const interval = setInterval(() => {
  $.log((++i).toString());
}, 1_000);

const index = await $.select({
  message: "Make a selection",
  options: ["1", "2"],
});
pb2.finish();
pb.finish();
clearInterval(interval);

$.log("Selected:", index);
$.log("The text below should show for a bit and then disappear.");

{
  using scope = staticText.createScope();
  const endTime = Date.now() + 1000;
  scope.setText(() => `All done in ${endTime - Date.now()}ms...`);
  await delay(1_000);
}
