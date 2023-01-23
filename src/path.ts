import { fs, path as stdPath, writeAll, writeAllSync } from "./deps.ts";

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

  ancestors() {
    throw new Error("todo");
  }

  components() {
    throw new Error("todo");
  }

  join(...pathSegments: string[]) {
    return new PathReference(stdPath.join(this.#path, ...pathSegments));
  }

  startsWith(text: string) {
    throw new Error("todo");
  }

  endsWith(text: string) {
    throw new Error("todo");
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
    throw new Error("todo");
  }

  isRelative() {
    throw new Error("todo");
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

  // todo: investigate helpers in deno/std and use them all here

  dirname() {
    throw new Error("todo");
  }

  basename() {
    throw new Error("todo");
  }

  extension() {
    throw new Error("todo");
  }

  withExtension(ext: string) {
    throw new Error("todo");
  }

  withBasename(basename: string) {
    throw new Error("todo");
  }

  exists() {
    return fs.exists(this.#path);
  }

  existsSync() {
    return fs.existsSync(this.#path);
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
  copyFile(destinationPath: string | URL) {
    return Deno.copyFile(this.#path, destinationPath)
      .then(() => new PathReference(destinationPath));
  }

  /**
   * Copies the file returning a promise that resolves to
   * the destination path synchronously.
   */
  copyFileSync(destinationPath: string | URL) {
    Deno.copyFileSync(this.#path, destinationPath);
    return new PathReference(destinationPath);
  }

  /**
   * Renames the file or directory returning a promise that resolves to
   * the renamed path.
   */
  rename(newPath: string | URL) {
    return Deno.rename(this.#path, newPath)
      .then(() => new PathReference(newPath));
  }

  /**
   * Renames the file or directory returning a promise that resolves to
   * the renamed path synchronously.
   */
  renameSync(newPath: string | URL) {
    return Deno.rename(this.#path, newPath)
      .then(() => new PathReference(newPath));
  }

  /** Opens the file and pipes it to the writable stream. */
  async pipeTo(dest: WritableStream<Uint8Array>, options?: PipeOptions) {
    const file = await Deno.open(this.#path, {
      read: true,
    });
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

  toString() {
    return this.#path;
  }
}

export class FsFileWrapper implements Deno.FsFile {
  #file: Deno.FsFile;

  constructor(file: Deno.FsFile) {
    this.#file = file;
  }

  get inner() {
    return this.#file;
  }

  writeAllText(text: string) {
    return this.writeAllBytes(new TextEncoder().encode(text));
  }

  writeAllTextSync(text: string) {
    return this.writeAllBytesSync(new TextEncoder().encode(text));
  }

  async writeAllBytes(bytes: Uint8Array) {
    await writeAll(this.#file, bytes);
    return this;
  }

  writeAllBytesSync(bytes: Uint8Array) {
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
