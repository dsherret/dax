import { assertEquals } from "@std/assert";
import { delayToIterator, filterEmptyRecordValues, formatMillis, getFileNameFromUrl } from "./common.ts";

Deno.test("should get delay iterator", () => {
  let iterator = delayToIterator("1s");
  assertEquals(iterator.next(), 1000);
  assertEquals(iterator.next(), 1000);
  iterator = delayToIterator(10);
  assertEquals(iterator.next(), 10);
  assertEquals(iterator.next(), 10);
  let value = 0;
  iterator = delayToIterator({
    next() {
      return value++;
    },
  });
  assertEquals(iterator.next(), 0);
  assertEquals(iterator.next(), 1);
  assertEquals(iterator.next(), 2);
});

Deno.test("should format milliseconds", () => {
  assertEquals(formatMillis(10), "10 milliseconds");
  assertEquals(formatMillis(1), "1 millisecond");
  assertEquals(formatMillis(1000), "1 second");
  assertEquals(formatMillis(2000), "2 seconds");
  assertEquals(formatMillis(1500), "1.5 seconds");
  assertEquals(formatMillis(60_000), "1 minute");
  assertEquals(formatMillis(61_000), "1.02 minutes");
  assertEquals(formatMillis(92_000), "1.53 minutes");
});

Deno.test("gets file name from url", () => {
  assertEquals(getFileNameFromUrl("https://deno.land/download.zip"), "download.zip");
  assertEquals(getFileNameFromUrl("https://deno.land/"), undefined);
  assertEquals(getFileNameFromUrl("https://deno.land/file/other"), "other");
  assertEquals(getFileNameFromUrl("https://deno.land/file/other/"), undefined);
});

Deno.test("filterEmptyRecordValues drops null and undefined", () => {
  assertEquals(filterEmptyRecordValues({ a: 1, b: undefined, c: 2 }), { a: 1, c: 2 });
  assertEquals(filterEmptyRecordValues<string | null>({ a: "x", b: null }), { a: "x" });
  assertEquals(filterEmptyRecordValues({}), {});
});
