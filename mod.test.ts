import $ from "./mod.ts";
import { assertEquals } from "./src/deps.test.ts";

Deno.test("should get stdout by default", async () => {
  const output = await $`deno eval 'console.log(5);'`;
  assertEquals(output.code, 0);
  assertEquals(output.stdout, "5\n");
});
