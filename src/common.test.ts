import { delayToMs } from "./common.ts";
import { assertEquals } from "./deps.test.ts";

Deno.test("should get delay value", () => {
  assertEquals(delayToMs(10), 10);
  assertEquals(delayToMs(`10s`), 10_000);
  assertEquals(delayToMs(`10.5s`), 10_500);
  assertEquals(delayToMs(`10.123s`), 10_123);
  assertEquals(delayToMs(`10ms`), 10);
  assertEquals(delayToMs(`10000ms`), 10_000);
});
