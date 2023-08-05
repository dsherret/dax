import { instantiate } from "./rs_lib.generated.js";

export type WasmInstance = Awaited<ReturnType<typeof instantiate>>;
export const wasmInstance = await instantiate();
