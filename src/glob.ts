import * as fs from "node:fs";
import * as nodePath from "node:path";
import { isWindows } from "./common.ts";

export interface ExpandGlobOptions {
  /** Directory to resolve relative glob patterns against. */
  root: string;
  /** Match path segments case-insensitively. */
  caseInsensitive?: boolean;
  /** When true, `**` matches zero or more path segments. */
  globstar?: boolean;
  /** When true, follow symlinks when descending and when matching. */
  followSymlinks?: boolean;
  /** When true, directories that match are yielded in addition to files. */
  includeDirs?: boolean;
}

export interface GlobEntry {
  path: string;
}

/**
 * Expands a glob pattern into matching filesystem entries.
 *
 * Handles `*`, `?`, `[...]` character classes, and (when `globstar` is enabled) `**`.
 * `\` on non-Windows and `` ` `` on Windows escape the following character.
 */
export async function* expandGlob(pattern: string, options: ExpandGlobOptions): AsyncGenerator<GlobEntry> {
  const opts = {
    caseInsensitive: options.caseInsensitive ?? false,
    globstar: options.globstar ?? true,
    followSymlinks: options.followSymlinks ?? false,
    includeDirs: options.includeDirs ?? true,
  };

  let startDir: string;
  let remaining: string;
  if (nodePath.isAbsolute(pattern)) {
    const parsed = nodePath.parse(pattern);
    startDir = parsed.root;
    remaining = pattern.slice(parsed.root.length);
  } else {
    startDir = options.root;
    remaining = pattern;
  }

  const segments = splitSegments(remaining).filter((s) => s.length > 0);
  yield* walkSegments(startDir, segments, 0, opts);
}

async function* walkSegments(
  dir: string,
  segments: string[],
  index: number,
  opts: { caseInsensitive: boolean; globstar: boolean; followSymlinks: boolean; includeDirs: boolean },
): AsyncGenerator<GlobEntry> {
  if (index >= segments.length) {
    return;
  }
  const segment = segments[index];
  const isLast = index === segments.length - 1;

  if (segment === "**" && opts.globstar) {
    // match zero segments — advance past the `**`
    yield* walkSegments(dir, segments, index + 1, opts);
    // match one or more — descend and re-match `**`
    let entries: fs.Dirent[];
    try {
      entries = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const entryPath = nodePath.join(dir, entry.name);
      if (await isDirectory(entry, entryPath, opts.followSymlinks)) {
        yield* walkSegments(entryPath, segments, index, opts);
      }
    }
    return;
  }

  if (!hasGlobChar(segment)) {
    const literal = unescapeGlob(segment);
    const nextPath = nodePath.join(dir, literal);
    // try the exact-case lookup first — the common case is the caller passed
    // the right case, and lstat is much cheaper than reading the whole dir.
    let stat: fs.Stats | undefined;
    try {
      stat = opts.followSymlinks ? await fs.promises.stat(nextPath) : await fs.promises.lstat(nextPath);
    } catch (err: any) {
      if (err?.code !== "ENOENT" || !opts.caseInsensitive || isWindows) {
        return;
      }
      // not found and we need case-insensitive matching on a case-sensitive
      // filesystem — fall back to scanning the directory.
      let entries: fs.Dirent[];
      try {
        entries = await fs.promises.readdir(dir, { withFileTypes: true });
      } catch {
        return;
      }
      const lowered = literal.toLowerCase();
      for (const entry of entries) {
        if (entry.name.toLowerCase() !== lowered) continue;
        yield* yieldOrDescend(nodePath.join(dir, entry.name), entry, segments, index, isLast, opts);
      }
      return;
    }
    if (isLast) {
      if (stat.isFile() || stat.isSymbolicLink() || (stat.isDirectory() && opts.includeDirs)) {
        yield { path: nextPath };
      }
    } else if (stat.isDirectory()) {
      yield* walkSegments(nextPath, segments, index + 1, opts);
    }
    return;
  }

  const regex = globSegmentToRegex(segment, opts.caseInsensitive);
  let entries: fs.Dirent[];
  try {
    entries = await fs.promises.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (!regex.test(entry.name)) continue;
    yield* yieldOrDescend(nodePath.join(dir, entry.name), entry, segments, index, isLast, opts);
  }
}

async function* yieldOrDescend(
  entryPath: string,
  entry: fs.Dirent,
  segments: string[],
  index: number,
  isLast: boolean,
  opts: { caseInsensitive: boolean; globstar: boolean; followSymlinks: boolean; includeDirs: boolean },
): AsyncGenerator<GlobEntry> {
  let isFile = entry.isFile();
  let isDir = entry.isDirectory();
  if (entry.isSymbolicLink()) {
    if (opts.followSymlinks) {
      try {
        const s = await fs.promises.stat(entryPath);
        isFile = s.isFile();
        isDir = s.isDirectory();
      } catch {
        return;
      }
    } else if (isLast) {
      // report unresolved symlinks as files at the terminal position
      isFile = true;
    }
  }
  if (isLast) {
    if (isFile || (isDir && opts.includeDirs)) {
      yield { path: entryPath };
    }
  } else if (isDir) {
    yield* walkSegments(entryPath, segments, index + 1, opts);
  }
}

async function isDirectory(entry: fs.Dirent, entryPath: string, followSymlinks: boolean): Promise<boolean> {
  if (entry.isDirectory()) return true;
  if (followSymlinks && entry.isSymbolicLink()) {
    try {
      return (await fs.promises.stat(entryPath)).isDirectory();
    } catch {
      return false;
    }
  }
  return false;
}

function splitSegments(pattern: string): string[] {
  const escape = escapeChar();
  const segments: string[] = [];
  let current = "";
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i];
    if (ch === escape && i + 1 < pattern.length) {
      current += ch + pattern[i + 1];
      i++;
    } else if (ch === "/" || (isWindows && ch === "\\")) {
      segments.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  segments.push(current);
  return segments;
}

function hasGlobChar(pattern: string): boolean {
  const escape = escapeChar();
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] === escape && i + 1 < pattern.length) {
      i++;
      continue;
    }
    const ch = pattern[i];
    if (ch === "*" || ch === "?" || ch === "[") {
      return true;
    }
  }
  return false;
}

function unescapeGlob(pattern: string): string {
  const escape = escapeChar();
  let result = "";
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] === escape && i + 1 < pattern.length) {
      result += pattern[i + 1];
      i++;
    } else {
      result += pattern[i];
    }
  }
  return result;
}

function globSegmentToRegex(pattern: string, caseInsensitive: boolean): RegExp {
  const escape = escapeChar();
  let regex = "^";
  let i = 0;
  while (i < pattern.length) {
    const ch = pattern[i];
    if (ch === escape && i + 1 < pattern.length) {
      regex += regexEscape(pattern[i + 1]);
      i += 2;
    } else if (ch === "*") {
      regex += ".*";
      i++;
    } else if (ch === "?") {
      regex += ".";
      i++;
    } else if (ch === "[") {
      // find matching closing bracket, accounting for leading `!`/`^` and a literal `]` right after
      let j = i + 1;
      if (j < pattern.length && (pattern[j] === "!" || pattern[j] === "^")) {
        j++;
      }
      if (j < pattern.length && pattern[j] === "]") {
        j++;
      }
      while (j < pattern.length && pattern[j] !== "]") {
        j++;
      }
      if (j >= pattern.length) {
        regex += regexEscape("[");
        i++;
      } else {
        let inner = pattern.slice(i + 1, j);
        const negated = inner.startsWith("!") || inner.startsWith("^");
        if (negated) inner = inner.slice(1);
        regex += "[" + (negated ? "^" : "") + inner.replace(/\\/g, "\\\\") + "]";
        i = j + 1;
      }
    } else {
      regex += regexEscape(ch);
      i++;
    }
  }
  regex += "$";
  return new RegExp(regex, caseInsensitive ? "i" : "");
}

function regexEscape(ch: string): string {
  return ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeChar(): string {
  return isWindows ? "`" : "\\";
}
