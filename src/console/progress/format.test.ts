import { assertEquals } from "../../deps.test.ts";
import { humanDownloadSize } from "./format.ts";

Deno.test("should format bytes", () => {
  assertEquals(
    humanDownloadSize(1023, 1023),
    "1023 B",
  );
  assertEquals(
    humanDownloadSize(1023, 1024),
    "0.99 KiB",
  );
  assertEquals(
    humanDownloadSize(10486, Math.pow(1024, 2)),
    "0.01 MiB",
  );

  assertEquals(
    humanDownloadSize(10737418, Math.pow(1024, 3)),
    "0.00 GiB",
  );
  assertEquals(
    humanDownloadSize(10737419, Math.pow(1024, 3)),
    "0.01 GiB",
  );
});
