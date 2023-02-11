import { path as stdPath, writeAll, writeAllSync } from "./deps.ts";

const PERIOD_CHAR_CODE = ".".charCodeAt(0);

export function createPathReference(path: string) {
  return new PathReference(path);
}

/**
 * Holds a reference to a path providing helper methods.
 */
export class PathReference {
  #path: string;

  constructor(path: string | URL) {
    this.#path = path instanceof URL ? stdPath.fromFileUrl(path) : path;
  }

  toString() {
    return this.#path;
  }

  join(...pathSegments: string[]) {
    return new PathReference(stdPath.join(this.#path, ...pathSegments));
  }

  resolve(...pathSegments: string[]) {
    return new PathReference(stdPath.resolve(this.#path, ...pathSegments));
  }

  /**
   * Normalize the `path`, resolving `'..'` and `'.'` segments.
   * Note that resolving these segments does not necessarily mean that all will be eliminated.
   * A `'..'` at the top-level will be preserved, and an empty path is canonically `'.'`.
   */
  normalize() {
    return new PathReference(stdPath.normalize(this.#path));
  }

  isDir() {
    return this.statSync()?.isDirectory ?? false;
  }

  isFile() {
    return this.statSync()?.isFile ?? false;
  }

  isSymlink() {
    return this.lstatSync()?.isSymlink ?? false;
  }

  isAbsolute() {
    return stdPath.isAbsolute(this.#path);
  }

  isRelative() {
    return !this.isAbsolute();
  }

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

  dirname() {
    return stdPath.dirname(this.#path);
  }

  basename() {
    return stdPath.basename(this.#path);
  }

  /** Return the extension of the `path` with leading period. */
  extname() {
    return stdPath.extname(this.#path);
  }

  withExtname(ext: string) {
    const currentExt = this.extname();
    const hasLeadingPeriod = ext.charCodeAt(0) === PERIOD_CHAR_CODE;
    if (!hasLeadingPeriod) {
      ext = "." + ext;
    }
    return new PathReference(this.#path.substring(0, this.#path.length - currentExt.length) + ext);
  }

  withBasename(basename: string) {
    const currentBaseName = this.basename();
    return new PathReference(this.#path.substring(0, this.#path.length - currentBaseName.length) + basename);
  }

  /** Gets the relative path from this path to the specified path. */
  relative(to: string | URL | PathReference) {
    const toPathRef = to instanceof PathReference ? to : new PathReference(to);
    console.log(this.resolve().#path, toPathRef.resolve().#path);
    console.log(stdPath.relative(this.resolve().#path, toPathRef.resolve().#path));
    return new PathReference(stdPath.relative(this.resolve().#path, toPathRef.resolve().#path));
  }

  exists() {
    return this.lstat().then((info) => info != null);
  }

  existsSync() {
    return this.lstatSync() != null;
  }

  realPath() {
    return Deno.realPath(this.#path).then((path) => new PathReference(path));
  }

  realPathSync() {
    return new PathReference(Deno.realPathSync(this.#path));
  }

  async mkdir(options?: Deno.MkdirOptions) {
    await Deno.mkdir(this.#path, options);
    return this;
  }

  mkdirSync(options?: Deno.MkdirOptions) {
    Deno.mkdirSync(this.#path, options);
    return this;
  }

  /**
   * Create a symlink at the specified path which points to the current path
   * using an absolute path.
   * @param linkPath The path to create a symlink at which points at the current path.
   * @returns The destination path.
   */
  async createAbsoluteSymlinkAt(linkPath: string | URL | PathReference) {
    const {
      linkPathRef,
      thisResolved,
    } = this.#getAbsoluteSymlinkAtParts(linkPath);
    await createSymlink({
      toPath: thisResolved,
      fromPath: linkPathRef,
      text: thisResolved.#path,
    });
    return linkPathRef;
  }

  /**
   * Create a symlink at the specified path which points to the current path
   * using an absolute path.
   * @param linkPath The path to create a symlink at which points at the current path.
   * @returns The destination path.
   */
  createAbsoluteSymlinkAtSync(linkPath: string | URL | PathReference) {
    const {
      linkPathRef,
      thisResolved,
    } = this.#getAbsoluteSymlinkAtParts(linkPath);
    createSymlinkSync({
      toPath: thisResolved,
      fromPath: linkPathRef,
      text: thisResolved.#path,
    });
    return linkPathRef;
  }

  #getAbsoluteSymlinkAtParts(linkPath: string | URL | PathReference) {
    const linkPathRef = (linkPath instanceof PathReference ? linkPath : new PathReference(linkPath)).resolve();
    const thisResolved = this.resolve();
    return {
      thisResolved,
      linkPathRef,
    };
  }

  /**
   * Create a symlink at the specified path which points to the current path
   * using a relative path.
   * @param linkPath The path to create a symlink at which points at the current path.
   * @returns The destination path.
   */
  async createRelativeSymlinkAt(linkPath: string | URL | PathReference) {
    const {
      linkPathRef,
      thisResolved,
      relativePath,
    } = this.#getRelativeSymlinkAtParts(linkPath);
    await createSymlink({
      toPath: thisResolved,
      fromPath: linkPathRef,
      text: relativePath.#path,
    });
    return linkPathRef;
  }

  /**
   * Synchronously create a symlink at the specified path which points to the current
   * path using a relative path.
   * @param linkPath The path to create a symlink at which points at the current path.
   * @returns The destination path.
   */
  createRelativeSymlinkAtSync(linkPath: string | URL | PathReference) {
    const {
      linkPathRef,
      thisResolved,
      relativePath,
    } = this.#getRelativeSymlinkAtParts(linkPath);
    createSymlinkSync({
      toPath: thisResolved,
      fromPath: linkPathRef,
      text: relativePath.#path,
    });
    return linkPathRef;
  }

  #getRelativeSymlinkAtParts(linkPath: string | URL | PathReference) {
    const linkPathRef = (linkPath instanceof PathReference ? linkPath : new PathReference(linkPath)).resolve();
    const thisResolved = this.resolve();
    let relativePath: PathReference;
    if (linkPathRef.dirname() === thisResolved.dirname()) {
      // we don't want it to do `../basename`
      relativePath = new PathReference(linkPathRef.basename());
    } else {
      relativePath = linkPathRef.relative(thisResolved);
    }
    return {
      thisResolved,
      linkPathRef,
      relativePath,
    };
  }

  readDir() {
    return Deno.readDir(this.#path);
  }

  readDirSync() {
    return Deno.readDirSync(this.#path);
  }

  bytes(options?: Deno.ReadFileOptions) {
    return Deno.readFile(this.#path, options);
  }

  bytesSync() {
    return Deno.readFileSync(this.#path);
  }

  maybeBytes(options?: Deno.ReadFileOptions) {
    return notFoundToUndefined(() => this.bytes(options));
  }

  maybeBytesSync() {
    return notFoundToUndefinedSync(() => this.bytesSync());
  }

  text(options?: Deno.ReadFileOptions) {
    return Deno.readTextFile(this.#path, options);
  }

  textSync() {
    return Deno.readTextFileSync(this.#path);
  }

  maybeText(options?: Deno.ReadFileOptions) {
    return notFoundToUndefined(() => this.text(options));
  }

  maybeTextSync() {
    return notFoundToUndefinedSync(() => this.textSync());
  }

  async json<T>(options?: Deno.ReadFileOptions) {
    const text = await this.text(options);
    return JSON.parse(text) as T;
  }

  jsonSync<T>() {
    return JSON.parse(this.textSync()) as T;
  }

  maybeJson<T>(options?: Deno.ReadFileOptions) {
    return notFoundToUndefined(() => this.json<T>(options));
  }

  maybeJsonSync<T>() {
    return notFoundToUndefinedSync(() => this.jsonSync<T>());
  }

  async write(data: Uint8Array, options?: Deno.WriteFileOptions) {
    await Deno.writeFile(this.#path, data, options);
    return this;
  }

  writeSync(data: Uint8Array, options?: Deno.WriteFileOptions) {
    Deno.writeFileSync(this.#path, data, options);
    return this;
  }

  async writeText(text: string, options?: Deno.WriteFileOptions) {
    await Deno.writeTextFile(this.#path, text, options);
    return this;
  }

  writeTextSync(text: string, options?: Deno.WriteFileOptions) {
    Deno.writeTextFileSync(this.#path, text, options);
    return this;
  }

  async writeJson(obj: unknown, options?: Deno.WriteFileOptions) {
    const text = JSON.stringify(obj);
    await this.writeText(text, options);
    return this;
  }

  writeJsonSync(obj: unknown, options?: Deno.WriteFileOptions) {
    const text = JSON.stringify(obj);
    this.writeTextSync(text, options);
    return this;
  }

  async writeJsonPretty(obj: unknown, options?: Deno.WriteFileOptions) {
    const text = JSON.stringify(obj, undefined, 2);
    await this.writeText(text, options);
    return this;
  }

  writeJsonPrettySync(obj: unknown, options?: Deno.WriteFileOptions) {
    const text = JSON.stringify(obj, undefined, 2);
    this.writeTextSync(text, options);
    return this;
  }

  async chmod(mode: number) {
    await Deno.chmod(this.#path, mode);
    return this;
  }

  chmodSync(mode: number) {
    Deno.chmodSync(this.#path, mode);
    return this;
  }

  async chown(uid: number | null, gid: number | null) {
    await Deno.chown(this.#path, uid, gid);
    return this;
  }

  chownSync(uid: number | null, gid: number | null) {
    Deno.chownSync(this.#path, uid, gid);
    return this;
  }

  create() {
    return Deno.create(this.#path)
      .then((file) => new FsFileWrapper(file));
  }

  createSync() {
    return new FsFileWrapper(Deno.createSync(this.#path));
  }

  createNew() {
    return this.open({
      createNew: true,
      read: true,
      write: true,
    });
  }

  createNewSync() {
    return this.openSync({
      createNew: true,
      read: true,
      write: true,
    });
  }

  open(options?: Deno.OpenOptions) {
    return Deno.open(this.#path, options)
      .then((file) => new FsFileWrapper(file));
  }

  openSync(options?: Deno.OpenOptions) {
    return new FsFileWrapper(Deno.openSync(this.#path, options));
  }

  /** Removes the file or directory from the file system. */
  async remove() {
    await Deno.remove(this.#path);
    return this;
  }

  /** Removes the file or directory from the file system synchronously. */
  removeSync() {
    Deno.removeSync(this.#path);
    return this;
  }

  /**
   * Copies the file returning a promise that resolves to
   * the destination path.
   */
  copyFile(destinationPath: string | URL | PathReference) {
    const pathRef = destinationPath instanceof PathReference ? destinationPath : new PathReference(destinationPath);
    return Deno.copyFile(this.#path, pathRef.#path)
      .then(() => pathRef);
  }

  /**
   * Copies the file returning a promise that resolves to
   * the destination path synchronously.
   */
  copyFileSync(destinationPath: string | URL | PathReference) {
    const pathRef = destinationPath instanceof PathReference ? destinationPath : new PathReference(destinationPath);
    Deno.copyFileSync(this.#path, pathRef.#path);
    return pathRef;
  }

  /**
   * Renames the file or directory returning a promise that resolves to
   * the renamed path.
   */
  rename(newPath: string | URL | PathReference) {
    const pathRef = newPath instanceof PathReference ? newPath : new PathReference(newPath);
    return Deno.rename(this.#path, pathRef.#path).then(() => pathRef);
  }

  /**
   * Renames the file or directory returning a promise that resolves to
   * the renamed path synchronously.
   */
  renameSync(newPath: string | URL | PathReference) {
    const pathRef = newPath instanceof PathReference ? newPath : new PathReference(newPath);
    return Deno.rename(this.#path, pathRef.#path).then(() => pathRef);
  }

  /** Opens the file and pipes it to the writable stream. */
  async pipeTo(dest: WritableStream<Uint8Array>, options?: PipeOptions) {
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
  }
}

async function createSymlink(opts: {
  fromPath: PathReference;
  toPath: PathReference;
  text: string;
}) {
  let kind: "file" | "dir" | undefined;
  if (Deno.build.os === "windows") {
    const info = await opts.toPath.lstat();
    if (info == null) {
      throw new Deno.errors.NotFound(`The target path '${opts.toPath.toString()}' did not exist.`);
    } else if (info?.isDirectory) {
      kind = "dir";
    } else if (info?.isFile) {
      kind = "file";
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
}) {
  let kind: "file" | "dir" | undefined;
  if (Deno.build.os === "windows") {
    const info = opts.toPath.lstatSync();
    if (info == null) {
      throw new Deno.errors.NotFound(`The target path '${opts.toPath.toString()}' did not exist.`);
    } else if (info?.isDirectory) {
      kind = "dir";
    } else if (info?.isFile) {
      kind = "file";
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

  get inner() {
    return this.#file;
  }

  writeText(text: string) {
    return this.writeBytes(new TextEncoder().encode(text));
  }

  writeTextSync(text: string) {
    return this.writeBytesSync(new TextEncoder().encode(text));
  }

  async writeBytes(bytes: Uint8Array) {
    await writeAll(this.#file, bytes);
    return this;
  }

  writeBytesSync(bytes: Uint8Array) {
    writeAllSync(this.#file, bytes);
    return this;
  }

  // below is Deno.FsFile implementation... could probably be something
  // done in the constructor instead.

  get rid() {
    return this.#file.rid;
  }

  get readable() {
    return this.#file.readable;
  }

  get writable() {
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
