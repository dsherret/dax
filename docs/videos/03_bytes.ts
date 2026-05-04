import $ from "../../mod.ts";

// .kind("bytes") formats counts as human-readable sizes (KiB / MiB / s)
const totalBytes = 40 * 1024 * 1024; // 40 MiB
const chunkSize = 256 * 1024;

const pb = $.progress("Downloading data.zip", { length: totalBytes })
  .kind("bytes");

await pb.with(async () => {
  for (let sent = 0; sent < totalBytes; sent += chunkSize) {
    await $.sleep(40);
    pb.increment(chunkSize);
  }
});

$.log("Download complete");
