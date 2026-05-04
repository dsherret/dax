import $ from "../../mod.ts";

// multiple progress bars at once — ordered by longest-running first,
// and the layout reflows as each one finishes
async function fakeDownload(name: string, sizeMiB: number, mibPerSec: number) {
  const total = sizeMiB * 1024 * 1024;
  const chunk = 128 * 1024;
  const chunkDelayMs = (1000 * chunk) / (mibPerSec * 1024 * 1024);

  const pb = $.progress(`Downloading ${name}`, { length: total }).kind("bytes");

  await pb.with(async () => {
    for (let sent = 0; sent < total; sent += chunk) {
      await $.sleep(chunkDelayMs);
      pb.increment(chunk);
    }
  });
}

await Promise.all([
  fakeDownload("readme.md", 1, 4),
  fakeDownload("node.tar.gz", 15, 6),
  fakeDownload("deno.zip", 30, 8),
  fakeDownload("rustc.tar.xz", 80, 12),
]);

$.log("All downloads complete");
