import * as fs from "node:fs";
import * as nodePath from "node:path";
import { globToRegExp } from "@std/path/glob-to-regexp";
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

interface ResolvedOptions {
  caseInsensitive: boolean;
  globstar: boolean;
  followSymlinks: boolean;
  includeDirs: boolean;
}

/**
 * Expands a glob pattern into matching filesystem entries.
 *
 * Segment conversion (`*`, `?`, `[...]`, and `**`) is delegated to
 * `@std/path/glob-to-regexp`.
 */
export async function* expandGlob(pattern: string, options: ExpandGlobOptions): AsyncGenerator<GlobEntry> {
  const opts: ResolvedOptions = {
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

  // only treat `\` as a path separator on Windows — on POSIX it's part of a filename (and the glob escape char)
  const sepRe = isWindows ? /[/\\]/ : /\//;
  const segments = remaining.split(sepRe).filter((s) => s.length > 0);
  yield* walkSegments(startDir, segments, 0, opts);
}

async function* walkSegments(
  dir: string,
  segments: string[],
  index: number,
  opts: ResolvedOptions,
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
    const nextPath = nodePath.join(dir, segment);
    // always stat (follow symlinks) for literal segments — otherwise intermediate symlinked
    // directories (e.g. macOS `/var` → `/private/var`) would abort traversal.
    let stat: fs.Stats | undefined;
    try {
      stat = await fs.promises.stat(nextPath);
    } catch (err: any) {
      if (err?.code !== "ENOENT" || !opts.caseInsensitive || isWindows) {
        return;
      }
      // case-insensitive match requested on a case-sensitive fs — fall back to dir scan
      let entries: fs.Dirent[];
      try {
        entries = await fs.promises.readdir(dir, { withFileTypes: true });
      } catch {
        return;
      }
      const lowered = segment.toLowerCase();
      for (const entry of entries) {
        if (entry.name.toLowerCase() !== lowered) continue;
        yield* yieldOrDescend(nodePath.join(dir, entry.name), entry, segments, index, isLast, opts);
      }
      return;
    }
    if (isLast) {
      if (stat.isFile() || (stat.isDirectory() && opts.includeDirs)) {
        yield { path: nextPath };
      }
    } else if (stat.isDirectory()) {
      yield* walkSegments(nextPath, segments, index + 1, opts);
    }
    return;
  }

  const regex = globToRegExp(segment, {
    caseInsensitive: opts.caseInsensitive,
    globstar: opts.globstar,
  });
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
  opts: ResolvedOptions,
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

function hasGlobChar(segment: string): boolean {
  for (let i = 0; i < segment.length; i++) {
    const ch = segment[i];
    if (ch === "*" || ch === "?" || ch === "[") return true;
  }
  return false;
}
