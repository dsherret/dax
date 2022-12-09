import { CommandContext, pipeTo } from "../command_handler.ts";
import { bailUnsupported, parseArgKinds } from "./args.ts";
import { Buffer, BufWriterSync } from "https://deno.land/std@0.167.0/io/buffer.ts";

export function xargsCommand(
  context: CommandContext,
): string[] {
  const flags = parseArgs(context.args);
  const buf = new BufWriterSync(new Buffer());
  pipeTo(context.stdin, buf);
  const text = new TextDecoder().decode(buf.buf);
  let args = flags.initialArgs;

  // defaults to echo
  if (args.length === 0) args.push("echo");

  const delim = flags.delimiter;
  if (delim !== undefined) {
    // strip a single trailing newline (xargs seems to do this)
    let finalText = text;
    if (delim === "\n") {
      if (text.startsWith(delim)) {
        const textStripped = text.replace(delim, "");
        finalText = textStripped;
      }
    }

    args = args.concat(finalText.split(delim));
  } else if (flags.isNullTerminated) {
    args = args.concat(text.split("\0"));
  } else {
    args = args.concat(delimitBlanks(text));
  }

  return args;
}

export function parseArgs(args: string[]) {
  const parseDelimiter = (arg: string) => {
    const chars = arrayTogen(Array.from(arg));
    const firstChar = chars.next();
    if (firstChar.value) {
      let delimiter = firstChar.value;
      if (firstChar.value === "\\") {
        switch (chars.next().value) {
          // todo: support more
          case "n":
            delimiter = "\n";
            break;
          case "r":
            delimiter = "\r";
            break;
          case "t":
            delimiter = "\t";
            break;
          case "\\":
            delimiter = "\\";
            break;
          case "0":
            delimiter = "\0";
            break;
          default:
            throw Error("unsupported/not implemented escape character");
        }
      }

      if (chars.next().value) throw Error(`expected a single byte char delimiter. Found: ${arg}`);

      return delimiter;
    } else {
      throw Error("expected non-empty delimiter");
    }
  };

  const initialArgs = [];
  let delimiter;
  const iterator = arrayTogen(parseArgKinds(args));
  let isNullTerminated = false;
  while (true) {
    const arg = iterator.next();
    if (!arg.value) break;

    const value = arg.value;
    if (value.kind === "Arg") {
      if (value.arg === "-0") {
        isNullTerminated = true;
      } else {
        initialArgs.push(value.arg);
        // parse the remainder as arguments
        for (const arg of iterator) {
          if (arg.kind === "Arg") initialArgs.push(arg.arg);
          else if (arg.kind === "ShortFlag") initialArgs.push(`-${arg.arg}`);
          else if (arg.kind === "LongFlag") initialArgs.push(`--${arg.arg}`);
        }
      }
    } else if (value.kind === "LongFlag" && value.arg === "null") {
      isNullTerminated = true;
    } else if (value.kind === "ShortFlag" && value.arg === "d") {
      const next = iterator.next().value;
      if (next && next.kind === "Arg") delimiter = parseDelimiter(next.arg);
      else throw Error("expected delimiter argument following -d");
    } else if (value.kind === "LongFlag") {
      const flag = value.arg;
      const flagArg = flag.replace(/^delimiter=/, "");
      if (flagArg) delimiter = parseDelimiter(flagArg);
      else bailUnsupported(arg.value);
    } else {
      bailUnsupported(arg.value);
    }
  }

  if (isNullTerminated && delimiter) throw Error("cannot specify both null and delimiter flag");

  return {
    initialArgs,
    delimiter,
    isNullTerminated,
  };
}

export function delimitBlanks(text: string) {
  const chars = peekable(arrayTogen(Array.from(text)));
  const result = [];
  while (chars.peek().value !== undefined) {
    let current = "";

    charsLoop:
    while (true) {
      const c = chars.next().value;
      if (c === undefined) break;
      switch (c) {
        case "\n":
        case "\t":
        case "\ ":
          break charsLoop;

        case '"':
        case "'": {
          const UNMATCHED_MESSAGE =
            "unmatched quote; by default quotes are special to xargs unless you use the -0 option";
          const originalQuoteChar = c;
          while (true) {
            const c = chars.next().value;
            if (c === undefined) break;
            if (c == originalQuoteChar) break;
            if (c === "\n") throw Error(UNMATCHED_MESSAGE);
            else current += c;

            if (chars.peek().value === undefined) throw Error(UNMATCHED_MESSAGE);
          }
          break;
        }
        case "\\": {
          const next = chars.peek();
          if (
            next.value === "\n" ||
            next.value === "\t" ||
            next.value === " " ||
            next.value === '"' ||
            next.value === "'"
          ) current += chars.next().value;
          else current += c;

          break;
        }
        default:
          current += c;
      }
    }

    if (current !== "") result.push(current);
  }
  return result;
}

function* arrayTogen<T>(array: T[]) {
  for (const e of array) yield e;
}

function peekable<T>(iterator: Generator<T>) {
  interface R {
    next: () => { value: T | undefined; done: boolean };
    peek: () => { value: T | undefined; done: boolean };
  }

  let state = iterator.next();

  const _i = (function* () {
    while (!state.done) {
      const current = state.value;
      state = iterator.next();
      yield current;
    }
    return state.value;
  })() as any;

  _i.peek = () => state;
  return _i as R;
}
