import { path as stdPath, writeAll, writeAllSync } from "./deps.ts";

const PERIOD_CHAR_CODE = ".".charCodeAt(0);

export function createPathReference(path: string | URL): PathReference {
  return new PathReference(path);
}

/**
 * Holds a reference to a path providing helper methods.
 *
 * Create one via `$`: `const srcDir = $.path("src");`
 */
export class PathReference {
  readonly #path: string;

  constructor(path: string | URL) {
    this.#path = path instanceof URL ? stdPath.fromFileUrl(path) : path;
  }

  /** Gets the string representation of this path. */
  toString(): string {
    return this.#path;
  }

  /** Joins the provided path segments onto this path. */
  join(...pathSegments: string[]): PathReference {
    return new PathReference(stdPath.join(this.#path, ...pathSegments));
  }

  /** Resolves this path to an absolute path along with the provided path segments. */
  resolve(...pathSegments: string[]): PathReference {
    return new PathReference(stdPath.resolve(this.#path, ...pathSegments));
  }

  /**
   * Normalizes the `path`, resolving `'..'` and `'.'` segments.
   * Note that resolving these segments does not necessarily mean that all will be eliminated.
   * A `'..'` at the top-level will be preserved, and an empty path is canonically `'.'`.
   */
  normalize(): PathReference {
    return new PathReference(stdPath.normalize(this.#path));
  }

  /** Follows symlinks and gets if this path is a directory. */
  isDir(): boolean {
    return this.statSync()?.isDirectory ?? false;
  }

  /** Follows symlinks and gets if this path is a file. */
  isFile(): boolean {
    return this.statSync()?.isFile ?? false;
  }

  /** Gets if this path is a symlink. */
  isSymlink(): boolean {
    return this.lstatSync()?.isSymlink ?? false;
  }

  /** Gets if this path is an absolute path. */
  isAbsolute(): boolean {
    return stdPath.isAbsolute(this.#path);
  }

  /** Gets if this path is relative. */
  isRelative(): boolean {
    return !this.isAbsolute();
  }

  /** Resolves the `Deno.FileInfo` of this path following symlinks. */
  async stat(): Promise<Deno.FileInfo | undefined> {
    try {
      return await Deno.stat(this.#path);
    } catch (err) {
      if (err instanceof Deno.errors.NotFound) {
        return undefined;
      } else {
        throw err;
      }
    }
  }

  /** Synchronously resolves the `Deno.FileInfo` of this
   * path following symlinks. */
  statSync(): Deno.FileInfo | undefined {
    try {
      return Deno.statSync(this.#path);
    } catch (err) {
      if (err instanceof Deno.errors.NotFound) {
        return undefined;
      } else {
        throw err;
      }
    }
  }

  /** Resolves the `Deno.FileInfo` of this path without
   * following symlinks. */
  async lstat(): Promise<Deno.FileInfo | undefined> {
    try {
      return await Deno.lstat(this.#path);
    } catch (err) {
      if (err instanceof Deno.errors.NotFound) {
        return undefined;
      } else {
        throw err;
      }
    }
  }

  /** Synchronously resolves the `Deno.FileInfo` of this path
   * without following symlinks. */
  lstatSync(): Deno.FileInfo | undefined {
    try {
      return Deno.lstatSync(this.#path);
    } catch (err) {
      if (err instanceof Deno.errors.NotFound) {
        return undefined;
      } else {
        throw err;
      }
    }
  }

  /**
   * Gets the directory path. In most cases, it is recommended
   * to use `.parent()` instead since it will give you a `PathReference`.
   */
  dirname(): string {
    return stdPath.dirname(this.#path);
  }

  /** Gets the file or directory name of the path. */
  basename(): string {
    return stdPath.basename(this.#path);
  }

  /** Resolves the path getting all its ancestor directories in order. */
  *ancestors(): Generator<PathReference> {
    let ancestor = this.parent();
    while (ancestor != null) {
      yield ancestor;
      ancestor = ancestor.parent();
    }
  }

  /** Gets the parent directory or returns undefined if the parent is the root directory. */
  parent(): PathReference | undefined {
    const resolvedPath = this.resolve();
    const dirname = resolvedPath.dirname();
    if (dirname === resolvedPath.#path) {
      return undefined;
    } else {
      return new PathReference(dirname);
    }
  }

  /** Gets the parent or throws if the current directory was the root. */
  parentOrThrow(): PathReference {
    const parent = this.parent();
    if (parent == null) {
      throw new Error(`Cannot get the parent directory of '${this.#path}'.`);
    }
    return parent;
  }

  /**
   * Returns the extension of the path with leading period or undefined
   * if there is no extension.
   */
  extname(): string | undefined {
    const extName = stdPath.extname(this.#path);
    return extName.length === 0 ? undefined : extName;
  }

  /** Gets a new path reference with the provided extension. */
  withExtname(ext: string): PathReference {
    const currentExt = this.extname();
    const hasLeadingPeriod = ext.charCodeAt(0) === PERIOD_CHAR_CODE;
    if (!hasLeadingPeriod) {
      ext = "." + ext;
    }
    return new PathReference(this.#path.substring(0, this.#path.length - (currentExt?.length ?? 0)) + ext);
  }

  /** Gets a new path reference with the provided file or directory name. */
  withBasename(basename: string): PathReference {
    const currentBaseName = this.basename();
    return new PathReference(this.#path.substring(0, this.#path.length - currentBaseName.length) + basename);
  }

  /** Gets the relative path from this path to the specified path. */
  relative(to: string | URL | PathReference): string {
    const toPathRef = ensurePathRef(to);
    console.log(this.resolve().#path, toPathRef.resolve().#path);
    console.log(stdPath.relative(this.resolve().#path, toPathRef.resolve().#path));
    return stdPath.relative(this.resolve().#path, toPathRef.resolve().#path);
  }

  /** Gets if the path exists. Beaware of TOCTOU issues. */
  exists(): Promise<boolean> {
    return this.lstat().then((info) => info != null);
  }

  /** Synchronously gets if the path exists. Beaware of TOCTOU issues. */
  existsSync(): boolean {
    return this.lstatSync() != null;
  }

  /** Resolves to the absolute normalized path, with symbolic links resolved. */
  realPath(): Promise<PathReference> {
    return Deno.realPath(this.#path).then((path) => new PathReference(path));
  }

  /** Synchronously resolves to the absolute normalized path, with symbolic links resolved. */
  realPathSync(): PathReference {
    return new PathReference(Deno.realPathSync(this.#path));
  }

  /** Creates a directory at this path. */
  async mkdir(options?: Deno.MkdirOptions): Promise<this> {
    await Deno.mkdir(this.#path, options);
    return this;
  }

  /** Synchronously creates a directory at this path. */
  mkdirSync(options?: Deno.MkdirOptions): this {
    Deno.mkdirSync(this.#path, options);
    return this;
  }

  /**
   * Creates a symlink at the provided path to the provided target returning the target path.
   */
  async createAbsoluteSymlinkTo(
    target: string | URL | PathReference,
    opts?: Deno.SymlinkOptions,
  ): Promise<PathReference> {
    const from = this.resolve();
    const to = ensurePathRef(target).resolve();
    await createSymlink({
      toPath: to,
      fromPath: from,
      text: to.#path,
      type: opts?.type,
    });
    return to;
  }

  /**
   * Synchronously creates a symlink at the provided path to the provided target returning the target path.
   * @returns The resolved target path.
   */
  createAbsoluteSymlinkToSync(target: string | URL | PathReference, opts?: Deno.SymlinkOptions): PathReference {
    const from = this.resolve();
    const to = ensurePathRef(target).resolve();
    createSymlinkSync({
      toPath: to,
      fromPath: from,
      text: to.#path,
      type: opts?.type,
    });
    return to;
  }

  /**
   * Creates a symlink at the specified path which points to the current path
   * using an absolute path.
   * @param linkPath The path to create a symlink at which points at the current path.
   * @returns The destination path.
   */
  async createAbsoluteSymlinkAt(
    linkPath: string | URL | PathReference,
    opts?: Deno.SymlinkOptions,
  ): Promise<PathReference> {
    const linkPathRef = ensurePathRef(linkPath).resolve();
    const thisResolved = this.resolve();
    await createSymlink({
      toPath: thisResolved,
      fromPath: linkPathRef,
      text: thisResolved.#path,
      type: opts?.type,
    });
    return linkPathRef;
  }

  /**
   * Creates a symlink at the specified path which points to the current path
   * using an absolute path.
   * @param linkPath The path to create a symlink at which points at the current path.
   * @returns The destination path.
   */
  createAbsoluteSymlinkAtSync(
    linkPath: string | URL | PathReference,
    opts?: Deno.SymlinkOptions,
  ): PathReference {
    const linkPathRef = ensurePathRef(linkPath).resolve();
    const thisResolved = this.resolve();
    createSymlinkSync({
      toPath: thisResolved,
      fromPath: linkPathRef,
      text: thisResolved.#path,
      type: opts?.type,
    });
    return linkPathRef;
  }

  /**
   * Creates a symlink at the specified path which points to the current path
   * using a relative path.
   * @param linkPath The path to create a symlink at which points at the current path.
   * @returns The destination path.
   */
  async createRelativeSymlinkAt(
    linkPath: string | URL | PathReference,
    opts?: Deno.SymlinkOptions,
  ): Promise<PathReference> {
    const {
      linkPathRef,
      thisResolved,
      relativePath,
    } = this.#getRelativeSymlinkAtParts(linkPath);
    await createSymlink({
      toPath: thisResolved,
      fromPath: linkPathRef,
      text: relativePath,
      type: opts?.type,
    });
    return linkPathRef;
  }

  /**
   * Synchronously creates a symlink at the specified path which points to the current
   * path using a relative path.
   * @param linkPath The path to create a symlink at which points at the current path.
   * @returns The destination path.
   */
  createRelativeSymlinkAtSync(
    linkPath: string | URL | PathReference,
    opts?: Deno.SymlinkOptions,
  ): PathReference {
    const {
      linkPathRef,
      thisResolved,
      relativePath,
    } = this.#getRelativeSymlinkAtParts(linkPath);
    createSymlinkSync({
      toPath: thisResolved,
      fromPath: linkPathRef,
      text: relativePath,
      type: opts?.type,
    });
    return linkPathRef;
  }

  #getRelativeSymlinkAtParts(linkPath: string | URL | PathReference) {
    const linkPathRef = ensurePathRef(linkPath).resolve();
    const thisResolved = this.resolve();
    let relativePath: string;
    if (linkPathRef.dirname() === thisResolved.dirname()) {
      // we don't want it to do `../basename`
      relativePath = linkPathRef.basename();
    } else {
      relativePath = linkPathRef.relative(thisResolved);
    }
    return {
      thisResolved,
      linkPathRef,
      relativePath,
    };
  }

  /** Reads the entries in the directory. */
  readDir(): AsyncIterable<Deno.DirEntry> {
    return Deno.readDir(this.#path);
  }

  /** Synchronously reads the entries in the directory. */
  readDirSync(): Iterable<Deno.DirEntry> {
    return Deno.readDirSync(this.#path);
  }

  /** Reads the bytes from the file. */
  bytes(options?: Deno.ReadFileOptions): Promise<Uint8Array> {
    return Deno.readFile(this.#path, options);
  }

  /** Synchronously reads the bytes from the file. */
  bytesSync(): Uint8Array {
    return Deno.readFileSync(this.#path);
  }

  /** Calls `.bytes()`, but returns undefined if the path doesn't exist. */
  maybeBytes(options?: Deno.ReadFileOptions): Promise<Uint8Array | undefined> {
    return notFoundToUndefined(() => this.bytes(options));
  }

  /** Calls `.bytesSync()`, but returns undefined if the path doesn't exist. */
  maybeBytesSync(): Uint8Array | undefined {
    return notFoundToUndefinedSync(() => this.bytesSync());
  }

  /** Reads the text from the file. */
  text(options?: Deno.ReadFileOptions): Promise<string> {
    return Deno.readTextFile(this.#path, options);
  }

  /** Synchronously reads the text from the file. */
  textSync(): string {
    return Deno.readTextFileSync(this.#path);
  }

  /** Calls `.text()`, but returns undefined when the path doesn't exist.
   * @remarks This still errors for other kinds of errors reading a file.
   */
  maybeText(options?: Deno.ReadFileOptions): Promise<string | undefined> {
    return notFoundToUndefined(() => this.text(options));
  }

  /** Calls `.textSync()`, but returns undefined when the path doesn't exist.
   * @remarks This still errors for other kinds of errors reading a file.
   */
  maybeTextSync(): string | undefined {
    return notFoundToUndefinedSync(() => this.textSync());
  }

  /** Reads and parses the file as JSON, throwing if it doesn't exist or is not valid JSON. */
  async json<T>(options?: Deno.ReadFileOptions): Promise<T> {
    return this.#parseJson<T>(await this.text(options));
  }

  /** Synchronously reads and parses the file as JSON, throwing if it doesn't
   * exist or is not valid JSON. */
  jsonSync<T>(): T {
    return this.#parseJson<T>(this.textSync());
  }

  #parseJson<T>(text: string) {
    try {
      return JSON.parse(text) as T;
    } catch (err) {
      throw new Error(`Failed parsing JSON in '${this.toString()}'.`, {
        cause: err,
      });
    }
  }

  /**
   * Calls `.json()`, but returns undefined if the file doesn't exist.
   * @remarks This method will still throw if the file cannot be parsed as JSON.
   */
  maybeJson<T>(options?: Deno.ReadFileOptions): Promise<T | undefined> {
    return notFoundToUndefined(() => this.json<T>(options));
  }

  /**
   * Calls `.jsonSync()`, but returns undefined if the file doesn't exist.
   * @remarks This method will still throw if the file cannot be parsed as JSON.
   */
  maybeJsonSync<T>(): T | undefined {
    return notFoundToUndefinedSync(() => this.jsonSync<T>());
  }

  /** Writes out the provided bytes to the file. */
  async write(data: Uint8Array, options?: Deno.WriteFileOptions): Promise<this> {
    await Deno.writeFile(this.#path, data, options);
    return this;
  }

  /** Synchronously writes out the provided bytes to the file. */
  writeSync(data: Uint8Array, options?: Deno.WriteFileOptions): this {
    Deno.writeFileSync(this.#path, data, options);
    return this;
  }

  /** Writes out the provided text to the file. */
  async writeText(text: string, options?: Deno.WriteFileOptions): Promise<this> {
    await Deno.writeTextFile(this.#path, text, options);
    return this;
  }

  /** Synchronously writes out the provided text to the file. */
  writeTextSync(text: string, options?: Deno.WriteFileOptions): this {
    Deno.writeTextFileSync(this.#path, text, options);
    return this;
  }

  /** Writes out the provided object as compact JSON. */
  async writeJson(obj: unknown, options?: Deno.WriteFileOptions): Promise<this> {
    const text = JSON.stringify(obj);
    await this.#writeTextWithEndNewLine(text, options);
    return this;
  }

  /** Synchronously writes out the provided object as compact JSON. */
  writeJsonSync(obj: unknown, options?: Deno.WriteFileOptions): this {
    const text = JSON.stringify(obj);
    this.#writeTextWithEndNewLineSync(text, options);
    return this;
  }

  /** Writes out the provided object as formatted JSON. */
  async writeJsonPretty(obj: unknown, options?: Deno.WriteFileOptions): Promise<this> {
    const text = JSON.stringify(obj, undefined, 2);
    await this.#writeTextWithEndNewLine(text, options);
    return this;
  }

  /** Synchronously writes out the provided object as formatted JSON. */
  writeJsonPrettySync(obj: unknown, options?: Deno.WriteFileOptions): this {
    const text = JSON.stringify(obj, undefined, 2);
    this.#writeTextWithEndNewLineSync(text, options);
    return this;
  }

  async #writeTextWithEndNewLine(text: string, options: Deno.WriteFileOptions | undefined) {
    const file = await this.open({ write: true, create: true, truncate: true, ...options });
    try {
      await file.writeText(text);
      await file.writeText("\n");
    } finally {
      try {
        file.close();
      } catch {
        // ignore
      }
    }
  }

  #writeTextWithEndNewLineSync(text: string, options: Deno.WriteFileOptions | undefined) {
    const file = this.openSync({ write: true, create: true, truncate: true, ...options });
    try {
      file.writeTextSync(text);
      file.writeTextSync("\n");
    } finally {
      try {
        file.close();
      } catch {
        // ignore
      }
    }
  }

  /** Changes the permissions of the file or directory. */
  async chmod(mode: number): Promise<this> {
    await Deno.chmod(this.#path, mode);
    return this;
  }

  /** Synchronously changes the permissions of the file or directory. */
  chmodSync(mode: number): this {
    Deno.chmodSync(this.#path, mode);
    return this;
  }

  /** Changes the ownership permissions of the file. */
  async chown(uid: number | null, gid: number | null): Promise<this> {
    await Deno.chown(this.#path, uid, gid);
    return this;
  }

  /** Synchronously changes the ownership permissions of the file. */
  chownSync(uid: number | null, gid: number | null): this {
    Deno.chownSync(this.#path, uid, gid);
    return this;
  }

  /** Creates a new file or opens the existing one. */
  create(): Promise<FsFileWrapper> {
    return Deno.create(this.#path)
      .then((file) => new FsFileWrapper(file));
  }

  /** Synchronously creates a new file or opens the existing one. */
  createSync(): FsFileWrapper {
    return new FsFileWrapper(Deno.createSync(this.#path));
  }

  /** Creates a file throwing if a file previously existed. */
  createNew(): Promise<FsFileWrapper> {
    return this.open({
      createNew: true,
      read: true,
      write: true,
    });
  }

  /** Synchronously creates a file throwing if a file previously existed. */
  createNewSync(): FsFileWrapper {
    return this.openSync({
      createNew: true,
      read: true,
      write: true,
    });
  }

  /** Opens a file. */
  open(options?: Deno.OpenOptions): Promise<FsFileWrapper> {
    return Deno.open(this.#path, options)
      .then((file) => new FsFileWrapper(file));
  }

  /** Opens a file synchronously. */
  openSync(options?: Deno.OpenOptions): FsFileWrapper {
    return new FsFileWrapper(Deno.openSync(this.#path, options));
  }

  /** Removes the file or directory from the file system. */
  async remove(options?: Deno.RemoveOptions): Promise<this> {
    await Deno.remove(this.#path, options);
    return this;
  }

  /** Removes the file or directory from the file system synchronously. */
  removeSync(options?: Deno.RemoveOptions): this {
    Deno.removeSync(this.#path, options);
    return this;
  }

  /**
   * Copies the file returning a promise that resolves to
   * the destination path.
   */
  copyFile(destinationPath: string | URL | PathReference): Promise<PathReference> {
    const pathRef = ensurePathRef(destinationPath);
    return Deno.copyFile(this.#path, pathRef.#path)
      .then(() => pathRef);
  }

  /**
   * Copies the file returning a promise that resolves to
   * the destination path synchronously.
   */
  copyFileSync(destinationPath: string | URL | PathReference): PathReference {
    const pathRef = ensurePathRef(destinationPath);
    Deno.copyFileSync(this.#path, pathRef.#path);
    return pathRef;
  }

  /**
   * Renames the file or directory returning a promise that resolves to
   * the renamed path.
   */
  rename(newPath: string | URL | PathReference): Promise<PathReference> {
    const pathRef = ensurePathRef(newPath);
    return Deno.rename(this.#path, pathRef.#path).then(() => pathRef);
  }

  /**
   * Renames the file or directory returning a promise that resolves to
   * the renamed path synchronously.
   */
  renameSync(newPath: string | URL | PathReference): PathReference {
    const pathRef = ensurePathRef(newPath);
    Deno.renameSync(this.#path, pathRef.#path);
    return pathRef;
  }

  /** Opens the file and pipes it to the writable stream. */
  async pipeTo(dest: WritableStream<Uint8Array>, options?: PipeOptions): Promise<this> {
    const file = await Deno.open(this.#path, { read: true });
    try {
      await file.readable.pipeTo(dest, options);
    } finally {
      try {
        file.close();
      } catch {
        // ignore
      }
    }
    return this;
  }
}

function ensurePathRef(path: string | URL | PathReference) {
  return path instanceof PathReference ? path : new PathReference(path);
}

async function createSymlink(opts: {
  fromPath: PathReference;
  toPath: PathReference;
  text: string;
  type: "file" | "dir" | undefined;
}) {
  let kind = opts.type;
  if (kind == null && Deno.build.os === "windows") {
    const info = await opts.toPath.lstat();
    if (info?.isDirectory) {
      kind = "dir";
    } else if (info?.isFile) {
      kind = "file";
    } else {
      throw new Deno.errors.NotFound(
        `The target path '${opts.toPath.toString()}' did not exist or path kind could not be determined. ` +
          `When the path doesn't exist, you need to specify a symlink type on Windows.`,
      );
    }
  }

  await Deno.symlink(
    opts.text,
    opts.fromPath.toString(),
    kind == null ? undefined : {
      type: kind,
    },
  );
}

function createSymlinkSync(opts: {
  fromPath: PathReference;
  toPath: PathReference;
  text: string;
  type: "file" | "dir" | undefined;
}) {
  let kind = opts.type;
  if (kind == null && Deno.build.os === "windows") {
    const info = opts.toPath.lstatSync();
    if (info?.isDirectory) {
      kind = "dir";
    } else if (info?.isFile) {
      kind = "file";
    } else {
      throw new Deno.errors.NotFound(
        `The target path '${opts.toPath.toString()}' did not exist or path kind could not be determined. ` +
          `When the path doesn't exist, you need to specify a symlink type on Windows.`,
      );
    }
  }

  Deno.symlinkSync(
    opts.text,
    opts.fromPath.toString(),
    kind == null ? undefined : {
      type: kind,
    },
  );
}

export class FsFileWrapper implements Deno.FsFile {
  #file: Deno.FsFile;

  constructor(file: Deno.FsFile) {
    this.#file = file;
  }

  /** Gets the inner `Deno.FsFile` that this wraps. */
  get inner(): Deno.FsFile {
    return this.#file;
  }

  /** Writes the provided text to this file. */
  writeText(text: string): Promise<this> {
    return this.writeBytes(new TextEncoder().encode(text));
  }

  /** Synchronously writes the provided text to this file. */
  writeTextSync(text: string): this {
    return this.writeBytesSync(new TextEncoder().encode(text));
  }

  /** Writes the provided bytes to the file. */
  async writeBytes(bytes: Uint8Array): Promise<this> {
    await writeAll(this.#file, bytes);
    return this;
  }

  /** Synchronously writes the provided bytes to the file. */
  writeBytesSync(bytes: Uint8Array): this {
    writeAllSync(this.#file, bytes);
    return this;
  }

  // below is Deno.FsFile implementation... could probably be something
  // done in the constructor instead.

  get rid(): number {
    return this.#file.rid;
  }

  get readable(): ReadableStream<Uint8Array> {
    return this.#file.readable;
  }

  get writable(): WritableStream<Uint8Array> {
    return this.#file.writable;
  }

  write(p: Uint8Array): Promise<number> {
    return this.#file.write(p);
  }

  writeSync(p: Uint8Array): number {
    return this.#file.writeSync(p);
  }

  truncate(len?: number | undefined): Promise<void> {
    return this.#file.truncate(len);
  }

  truncateSync(len?: number | undefined): void {
    return this.#file.truncateSync(len);
  }

  read(p: Uint8Array): Promise<number | null> {
    return this.#file.read(p);
  }

  readSync(p: Uint8Array): number | null {
    return this.#file.readSync(p);
  }

  seek(offset: number, whence: Deno.SeekMode): Promise<number> {
    return this.#file.seek(offset, whence);
  }

  seekSync(offset: number, whence: Deno.SeekMode): number {
    return this.#file.seekSync(offset, whence);
  }

  stat(): Promise<Deno.FileInfo> {
    return this.#file.stat();
  }

  statSync(): Deno.FileInfo {
    return this.#file.statSync();
  }

  close(): void {
    return this.#file.close();
  }
}

async function notFoundToUndefined<T>(action: () => Promise<T>) {
  try {
    return await action();
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      return undefined;
    } else {
      throw err;
    }
  }
}

function notFoundToUndefinedSync<T>(action: () => T) {
  try {
    return action();
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      return undefined;
    } else {
      throw err;
    }
  }
}
