export interface ArgKind {
  kind: "ShortFlag" | "LongFlag" | "Arg";
  arg: string;
}

export function parse_arg_kinds(flags: string[]): ArgKind[] {
  const result: ArgKind[] = [];
  let had_dash_dash = false;
  for (const arg of flags) {
    if (had_dash_dash) {
      result.push({ arg, kind: "Arg" });
    } else if (arg == "-") {
      result.push({ arg: "-", kind: "Arg" });
    } else if (arg == "--") {
      had_dash_dash = true;
    } else if (arg.startsWith("--")) {
      result.push({ arg: arg.replace(/^--/, ""), kind: "LongFlag" });
    } else if (arg.startsWith("-")) {
      const flags = arg.replace(/^-/, "");
      if (!isNaN(parseFloat(flags))) {
        result.push({ arg, kind: "Arg" });
      } else {
        for (const c of flags) {
          result.push({ arg: c, kind: "ShortFlag" });
        }
      }
    } else {
      result.push({ arg, kind: "Arg" });
    }
  }
  return result;
}
