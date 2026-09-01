import { assertEquals } from "@std/assert";
import process from "node:process";
import { styleText } from "./styleText.ts";

const red = "\x1b[31mx\x1b[39m";

Deno.test("should colour by default", () => {
  withEnv({}, () => {
    assertEquals(styleText("red", "x"), red);
  });
});

Deno.test("should not colour when NO_COLOR is set", () => {
  withEnv({ NO_COLOR: "1" }, () => {
    assertEquals(styleText("red", "x"), "x");
  });
});

Deno.test("should colour when NO_COLOR is empty", () => {
  // the NO_COLOR spec only disables colour for a non-empty value
  withEnv({ NO_COLOR: "" }, () => {
    assertEquals(styleText("red", "x"), red);
  });
});

Deno.test("should colour for FORCE_COLOR values node accepts", () => {
  for (const value of ["", "1", "2", "3", "true"]) {
    withEnv({ FORCE_COLOR: value }, () => {
      assertEquals(styleText("red", "x"), red, `FORCE_COLOR=${value}`);
    });
  }
});

Deno.test("should not colour for other FORCE_COLOR values", () => {
  for (const value of ["0", "false", "no"]) {
    withEnv({ FORCE_COLOR: value }, () => {
      assertEquals(styleText("red", "x"), "x", `FORCE_COLOR=${value}`);
    });
  }
});

Deno.test("should have FORCE_COLOR take precedence over NO_COLOR", () => {
  withEnv({ FORCE_COLOR: "1", NO_COLOR: "1" }, () => {
    assertEquals(styleText("red", "x"), red);
  });
  withEnv({ FORCE_COLOR: "0", NO_COLOR: "1" }, () => {
    assertEquals(styleText("red", "x"), "x");
  });
});

Deno.test("should combine formats", () => {
  withEnv({}, () => {
    assertEquals(styleText(["bold", "blue"], "x"), "\x1b[1m\x1b[34mx\x1b[39m\x1b[22m");
  });
});

// runs the action with only the provided colour env vars set, restoring the
// previous values afterwards
function withEnv(env: { NO_COLOR?: string; FORCE_COLOR?: string }, action: () => void) {
  const names = ["NO_COLOR", "FORCE_COLOR"] as const;
  const original = names.map((name) => [name, process.env[name]] as const);
  try {
    for (const name of names) {
      setEnv(name, env[name]);
    }
    action();
  } finally {
    for (const [name, value] of original) {
      setEnv(name, value);
    }
  }
}

function setEnv(name: string, value: string | undefined) {
  if (value == null) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}
