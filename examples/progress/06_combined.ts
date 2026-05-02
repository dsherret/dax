import $ from "../../mod.ts";

// progress bars, log lines, and a $.select prompt all alive at once.
// dax's logger coordinates them so logs print above bars, the prompt
// renders below, and bars continue animating while you choose.

$.logStep("Loaded", "config.json");
$.logStep("Connected", "to api.example.com");
$.logStep("Authenticated", "as user@example.com");

const jobs = [
  { name: "Data 1", total: 100, ms: 50 },
  { name: "Data 2", total: 200, ms: 30 },
  { name: "Data 3", total: 300, ms: 20 },
  { name: "Data 4", total: 400, ms: 18 },
  { name: "Data 5", total: 500, ms: 14 },
];

const work = Promise.all(jobs.map(async (job) => {
  const pb = $.progress(`Processing ${job.name}`, { length: job.total });
  await pb.with(async () => {
    for (let i = 0; i < job.total; i++) {
      await $.sleep(job.ms);
      pb.increment();
    }
  });
}));

const colour = await $.select({
  message: "What's your favourite colour out of these?",
  options: ["Red", "Green", "Blue"],
});

await work;

$.logStep("Picked", colour.value);
