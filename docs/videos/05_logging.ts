import $ from "../../mod.ts";

// $.log* output is printed *above* active progress bars without tearing them
const tables = ["users", "orders", "products", "invoices", "shipments"];

const pb = $.progress("Migrating tables", { length: tables.length });

await pb.with(async () => {
  for (const table of tables) {
    $.logStep("Migrating", table);
    await $.sleep(700);
    $.logLight(`  ${table}: 1,234 rows copied`);
    await $.sleep(300);
    pb.increment();
  }
});

$.log("Migration complete");
