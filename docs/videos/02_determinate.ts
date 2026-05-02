import $ from "../../mod.ts";

// determinate bar — pass `length` for a filled bar with a percent.
// .message() can be updated mid-run to reflect the current step.
const files = [
  "src/index.ts",
  "src/config.ts",
  "src/server.ts",
  "src/router.ts",
  "src/middleware/auth.ts",
  "src/middleware/cors.ts",
  "src/middleware/log.ts",
  "src/utils/log.ts",
  "src/utils/path.ts",
  "src/utils/time.ts",
  "src/db/client.ts",
  "src/db/schema.ts",
  "src/db/migrate.ts",
  "src/api/users.ts",
  "src/api/orders.ts",
  "src/api/products.ts",
  "src/cli.ts",
  "src/types.ts",
  "test/server.test.ts",
  "test/router.test.ts",
];

const pb = $.progress("Type-checking", { length: files.length });

await pb.with(async () => {
  for (const file of files) {
    pb.message(file);
    await $.sleep(180);
    pb.increment();
  }
});

$.logStep("Done");
