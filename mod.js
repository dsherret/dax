/// <reference types="./mod.d.ts" />
import * as pack36 from "https://deno.land/std@0.182.0/fmt/colors.ts";
import * as pack37 from "https://deno.land/std@0.182.0/fs/mod.ts";
import * as pack38 from "https://deno.land/std@0.182.0/io/buffer.ts";
import * as pack39 from "https://deno.land/std@0.182.0/io/buf_reader.ts";
import * as pack40 from "https://deno.land/std@0.182.0/path/mod.ts";
import * as pack41 from "https://deno.land/std@0.182.0/streams/read_all.ts";
import * as pack42 from "https://deno.land/std@0.182.0/streams/reader_from_stream_reader.ts";
import * as pack43 from "https://deno.land/std@0.182.0/streams/write_all.ts";
import * as pack44 from "https://deno.land/x/dir@1.5.1/data_local_dir/mod.ts";
import * as pack45 from "https://deno.land/x/outdent@v0.8.0/src/index.ts";
import * as pack46 from "https://deno.land/x/which@0.3.0/mod.ts";
const pack0 = {
  CommandBuilder: undefined,
  CommandChild: undefined,
  CommandResult: undefined,
  escapeArg: undefined,
  getRegisteredCommandNamesSymbol: undefined,
  parseAndSpawnCommand: undefined,
};
const pack9 = {
  cdCommand: undefined,
};
const pack10 = {
  printEnvCommand: undefined,
};
const pack11 = {
  cpCommand: undefined,
  mvCommand: undefined,
  parseCpArgs: undefined,
  parseMvArgs: undefined,
};
const pack27 = {
  bailUnsupported: undefined,
  parseArgKinds: undefined,
};
const pack12 = {
  echoCommand: undefined,
};
const pack13 = {
  catCommand: undefined,
  parseCatArgs: undefined,
};
const pack14 = {
  exitCommand: undefined,
};
const pack15 = {
  exportCommand: undefined,
};
const pack16 = {
  mkdirCommand: undefined,
  parseArgs: undefined,
};
const pack17 = {
  parseArgs: undefined,
  rmCommand: undefined,
};
const pack18 = {
  parseArgs: undefined,
  pwdCommand: undefined,
};
const pack19 = {
  sleepCommand: undefined,
};
const pack20 = {
  testCommand: undefined,
};
const pack21 = {
  parseArgs: undefined,
  touchCommand: undefined,
};
const pack22 = {
  unsetCommand: undefined,
};
const pack23 = {
  CapturingBufferWriter: undefined,
  InheritStaticTextBypassWriter: undefined,
  NullPipeWriter: undefined,
  PipedBuffer: undefined,
  ShellPipeWriter: undefined,
};
const pack28 = {
  LoggerRefreshItemKind: undefined,
  logger: undefined,
};
const pack29 = {
  Keys: undefined,
  createSelection: undefined,
  hideCursor: undefined,
  isOutputTty: undefined,
  readKeys: undefined,
  resultOrExit: undefined,
  safeConsoleSize: undefined,
  showCursor: undefined,
  staticText: undefined,
};
const pack24 = {
  Context: undefined,
  parseCommand: undefined,
  spawn: undefined,
};
const pack25 = {
  addProgressBar: undefined,
  forceRender: undefined,
  isShowingProgressBars: undefined,
  removeProgressBar: undefined,
};
const pack1 = {
  Box: undefined,
  LoggerTreeBox: undefined,
  TreeBox: undefined,
  delayToIterator: undefined,
  delayToMs: undefined,
  filterEmptyRecordValues: undefined,
  formatMillis: undefined,
  getExecutableShebang: undefined,
  getExecutableShebangFromPath: undefined,
  getFileNameFromUrl: undefined,
  resolvePath: undefined,
  safeLstat: undefined,
};
const pack2 = {
  ProgressBar: undefined,
  confirm: undefined,
  isShowingProgressBars: undefined,
  logger: undefined,
  maybeConfirm: undefined,
  maybeMultiSelect: undefined,
  maybePrompt: undefined,
  maybeSelect: undefined,
  multiSelect: undefined,
  prompt: undefined,
  select: undefined,
};
const pack30 = {
  confirm: undefined,
  innerConfirm: undefined,
  maybeConfirm: undefined,
};
const pack31 = {
  innerMultiSelect: undefined,
  maybeMultiSelect: undefined,
  multiSelect: undefined,
};
const pack32 = {
  ProgressBar: undefined,
  isShowingProgressBars: undefined,
  renderProgressBar: undefined,
};
const pack35 = {
  humanDownloadSize: undefined,
};
const pack33 = {
  innerPrompt: undefined,
  maybePrompt: undefined,
  prompt: undefined,
};
const pack34 = {
  innerSelect: undefined,
  maybeSelect: undefined,
  select: undefined,
};
const pack3 = {
  BufReader: undefined,
  Buffer: undefined,
  DenoWhichRealEnvironment: undefined,
  colors: undefined,
  fs: undefined,
  localDataDir: undefined,
  outdent: undefined,
  path: undefined,
  readAll: undefined,
  readerFromStreamReader: undefined,
  which: undefined,
  whichSync: undefined,
  writeAll: undefined,
  writeAllSync: undefined,
};
const pack4 = {
  wasmInstance: undefined,
};
const pack47 = {
  instantiate: undefined,
  instantiateWithInstance: undefined,
  isInstantiated: undefined,
  parse: undefined,
  static_text_clear_text: undefined,
  static_text_render_once: undefined,
  static_text_render_text: undefined,
  strip_ansi_codes: undefined,
};
const pack5 = {
  RequestBuilder: undefined,
  RequestResult: undefined,
  makeRequest: undefined,
  withProgressBarFactorySymbol: undefined,
};
const pack6 = {
  FsFileWrapper: undefined,
  PathRef: undefined,
  createPathRef: undefined,
};
const pack26 = {
  getAbortedResult: undefined,
  resultFromCode: undefined,
};
(function _src_result_ts() {
  function resultFromCode(code) {
    return {
      kind: "continue",
      code,
    };
  }
  function getAbortedResult() {
    return {
      kind: "exit",
      code: 124,
    };
  }
  Object.defineProperty(pack26, "resultFromCode", {
    get: () => resultFromCode,
  });
  Object.defineProperty(pack26, "getAbortedResult", {
    get: () => getAbortedResult,
  });
})();
(function _src_path_ts() {
  const PERIOD_CHAR_CODE = ".".charCodeAt(0);
  function createPathRef(path) {
    if (path instanceof PathRef) {
      return path;
    } else {
      return new PathRef(path);
    }
  }
  class PathRef {
    #path;
    #knownResolved = false;
    static instanceofSymbol = Symbol.for("dax.PathRef");
    constructor(path) {
      if (path instanceof URL) {
        this.#path = pack3.path.fromFileUrl(path);
      } else if (path instanceof PathRef) {
        this.#path = path.toString();
      } else if (typeof path === "string") {
        if (path.startsWith("file://")) {
          this.#path = pack3.path.fromFileUrl(path);
        } else {
          this.#path = path;
        }
      } else {
        this.#path = pack3.path.fromFileUrl(path.url);
      }
    }
    static [Symbol.hasInstance](instance) {
      // this should never change because it should work accross versions
      return instance?.constructor?.instanceofSymbol === PathRef.instanceofSymbol;
    }
    [Symbol.for("Deno.customInspect")]() {
      return `PathRef("${this.#path}")`;
    }
    toString() {
      return this.#path;
    }
    toFileUrl() {
      const resolvedPath = this.resolve();
      return pack3.path.toFileUrl(resolvedPath.toString());
    }
    equals(otherPath) {
      return this.resolve().toString() === otherPath.resolve().toString();
    }
    join(...pathSegments) {
      return new PathRef(pack3.path.join(this.#path, ...pathSegments));
    }
    resolve(...pathSegments) {
      if (this.#knownResolved && pathSegments.length === 0) {
        return this;
      }
      const resolvedPath = pack3.path.resolve(this.#path, ...pathSegments);
      if (pathSegments.length === 0 && resolvedPath === this.#path) {
        this.#knownResolved = true;
        return this;
      } else {
        const pathRef = new PathRef(resolvedPath);
        pathRef.#knownResolved = true;
        return pathRef;
      }
    }
    normalize() {
      return new PathRef(pack3.path.normalize(this.#path));
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
      return pack3.path.isAbsolute(this.#path);
    }
    isRelative() {
      return !this.isAbsolute();
    }
    async stat() {
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
    statSync() {
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
    async lstat() {
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
    lstatSync() {
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
      return pack3.path.dirname(this.#path);
    }
    basename() {
      return pack3.path.basename(this.#path);
    }
    *ancestors() {
      let ancestor = this.parent();
      while (ancestor != null) {
        yield ancestor;
        ancestor = ancestor.parent();
      }
    }
    parent() {
      const resolvedPath = this.resolve();
      const dirname = resolvedPath.dirname();
      if (dirname === resolvedPath.#path) {
        return undefined;
      } else {
        return new PathRef(dirname);
      }
    }
    parentOrThrow() {
      const parent = this.parent();
      if (parent == null) {
        throw new Error(`Cannot get the parent directory of '${this.#path}'.`);
      }
      return parent;
    }
    extname() {
      const extName = pack3.path.extname(this.#path);
      return extName.length === 0 ? undefined : extName;
    }
    withExtname(ext) {
      const currentExt = this.extname();
      const hasLeadingPeriod = ext.charCodeAt(0) === PERIOD_CHAR_CODE;
      if (!hasLeadingPeriod) {
        ext = "." + ext;
      }
      return new PathRef(this.#path.substring(0, this.#path.length - (currentExt?.length ?? 0)) + ext);
    }
    withBasename(basename) {
      const currentBaseName = this.basename();
      return new PathRef(this.#path.substring(0, this.#path.length - currentBaseName.length) + basename);
    }
    relative(to) {
      const toPathRef = ensurePathRef(to);
      console.log(this.resolve().#path, toPathRef.resolve().#path);
      console.log(pack3.path.relative(this.resolve().#path, toPathRef.resolve().#path));
      return pack3.path.relative(this.resolve().#path, toPathRef.resolve().#path);
    }
    exists() {
      return this.lstat().then((info) => info != null);
    }
    existsSync() {
      return this.lstatSync() != null;
    }
    realPath() {
      return Deno.realPath(this.#path).then((path) => new PathRef(path));
    }
    realPathSync() {
      return new PathRef(Deno.realPathSync(this.#path));
    }
    async *expandGlob(glob, options) {
      const entries = pack3.fs.expandGlob(glob, {
        root: this.resolve().toString(),
        ...options,
      });
      for await (const entry of entries) {
        yield this.#stdWalkEntryToDax(entry);
      }
    }
    *expandGlobSync(glob, options) {
      const entries = pack3.fs.expandGlobSync(glob, {
        root: this.resolve().toString(),
        ...options,
      });
      for (const entry of entries) {
        yield this.#stdWalkEntryToDax(entry);
      }
    }
    async *walk(options) {
      // Resolve the path before walking so that these paths always point to
      // absolute paths in the case that someone changes the cwd after walking.
      for await (const entry of pack3.fs.walk(this.resolve().toString(), options)) {
        yield this.#stdWalkEntryToDax(entry);
      }
    }
    *walkSync(options) {
      for (const entry of pack3.fs.walkSync(this.resolve().toString(), options)) {
        yield this.#stdWalkEntryToDax(entry);
      }
    }
    #stdWalkEntryToDax(entry) {
      return {
        ...entry,
        path: new PathRef(entry.path),
      };
    }
    async mkdir(options) {
      await Deno.mkdir(this.#path, {
        recursive: true,
        ...options,
      });
      return this;
    }
    mkdirSync(options) {
      Deno.mkdirSync(this.#path, {
        recursive: true,
        ...options,
      });
      return this;
    }
    async createSymlinkTo(target, opts) {
      await createSymlink(this.#resolveCreateSymlinkOpts(target, opts));
    }
    createSymlinkToSync(target, opts) {
      createSymlinkSync(this.#resolveCreateSymlinkOpts(target, opts));
    }
    #resolveCreateSymlinkOpts(target, opts) {
      if (opts?.kind == null) {
        if (typeof target === "string") {
          return {
            fromPath: this.resolve(),
            targetPath: ensurePathRef(target),
            text: target,
            type: opts?.type,
          };
        } else {
          throw new Error("Please specify if this symlink is absolute or relative. Otherwise provide the target text.");
        }
      }
      const targetPath = ensurePathRef(target).resolve();
      if (opts?.kind === "relative") {
        const fromPath = this.resolve();
        let relativePath;
        if (fromPath.dirname() === targetPath.dirname()) {
          // we don't want it to do `../basename`
          relativePath = targetPath.basename();
        } else {
          relativePath = fromPath.relative(targetPath);
        }
        return {
          fromPath,
          targetPath,
          text: relativePath,
          type: opts?.type,
        };
      } else {
        return {
          fromPath: this.resolve(),
          targetPath,
          text: targetPath.#path,
          type: opts?.type,
        };
      }
    }
    async *readDir() {
      const dir = this.resolve();
      for await (const entry of Deno.readDir(dir.#path)) {
        yield {
          ...entry,
          path: dir.join(entry.name),
        };
      }
    }
    *readDirSync() {
      const dir = this.resolve();
      for (const entry of Deno.readDirSync(dir.#path)) {
        yield {
          ...entry,
          path: dir.join(entry.name),
        };
      }
    }
    async *readDirFilePaths() {
      const dir = this.resolve();
      for await (const entry of Deno.readDir(dir.#path)) {
        if (entry.isFile) {
          yield dir.join(entry.name);
        }
      }
    }
    *readDirFilePathsSync() {
      const dir = this.resolve();
      for (const entry of Deno.readDirSync(dir.#path)) {
        if (entry.isFile) {
          yield dir.join(entry.name);
        }
      }
    }
    readBytes(options) {
      return Deno.readFile(this.#path, options);
    }
    readBytesSync() {
      return Deno.readFileSync(this.#path);
    }
    readMaybeBytes(options) {
      return notFoundToUndefined(() => this.readBytes(options));
    }
    readMaybeBytesSync() {
      return notFoundToUndefinedSync(() => this.readBytesSync());
    }
    readText(options) {
      return Deno.readTextFile(this.#path, options);
    }
    readTextSync() {
      return Deno.readTextFileSync(this.#path);
    }
    readMaybeText(options) {
      return notFoundToUndefined(() => this.readText(options));
    }
    readMaybeTextSync() {
      return notFoundToUndefinedSync(() => this.readTextSync());
    }
    async readJson(options) {
      return this.#parseJson(await this.readText(options));
    }
    readJsonSync() {
      return this.#parseJson(this.readTextSync());
    }
    #parseJson(text) {
      try {
        return JSON.parse(text);
      } catch (err) {
        throw new Error(`Failed parsing JSON in '${this.toString()}'.`, {
          cause: err,
        });
      }
    }
    readMaybeJson(options) {
      return notFoundToUndefined(() => this.readJson(options));
    }
    readMaybeJsonSync() {
      return notFoundToUndefinedSync(() => this.readJsonSync());
    }
    async write(data, options) {
      await this.#withFileForWriting(options, (file) => file.write(data));
      return this;
    }
    writeSync(data, options) {
      this.#withFileForWritingSync(options, (file) => {
        file.writeSync(data);
      });
      return this;
    }
    async writeText(text, options) {
      await this.#withFileForWriting(options, (file) => file.writeText(text));
      return this;
    }
    writeTextSync(text, options) {
      this.#withFileForWritingSync(options, (file) => {
        file.writeTextSync(text);
      });
      return this;
    }
    async writeJson(obj, options) {
      const text = JSON.stringify(obj);
      await this.#writeTextWithEndNewLine(text, options);
      return this;
    }
    writeJsonSync(obj, options) {
      const text = JSON.stringify(obj);
      this.#writeTextWithEndNewLineSync(text, options);
      return this;
    }
    async writeJsonPretty(obj, options) {
      const text = JSON.stringify(obj, undefined, 2);
      await this.#writeTextWithEndNewLine(text, options);
      return this;
    }
    writeJsonPrettySync(obj, options) {
      const text = JSON.stringify(obj, undefined, 2);
      this.#writeTextWithEndNewLineSync(text, options);
      return this;
    }
    #writeTextWithEndNewLine(text, options) {
      return this.#withFileForWriting(options, async (file) => {
        await file.writeText(text);
        await file.writeText("\n");
      });
    }
    async #withFileForWriting(options, action) {
      const file = await this.#openFileForWriting(options);
      try {
        return await action(file);
      } finally {
        try {
          file.close();
        } catch {
          // ignore
        }
      }
    }
    async #openFileForWriting(options) {
      const resolvedPath = this.resolve(); // pre-resolve before going async in case the cwd changes
      try {
        return await resolvedPath.open({
          write: true,
          create: true,
          truncate: true,
          ...options,
        });
      } catch (err) {
        if (err instanceof Deno.errors.NotFound) {
          // attempt to create the parent directory when it doesn't exist
          const parent = resolvedPath.parent();
          if (parent != null) {
            try {
              await parent.mkdir();
            } catch {
              throw err; // throw the original error
            }
          }
          return await resolvedPath.open({
            write: true,
            create: true,
            truncate: true,
            ...options,
          });
        } else {
          throw err;
        }
      }
    }
    #writeTextWithEndNewLineSync(text, options) {
      this.#withFileForWritingSync(options, (file) => {
        file.writeTextSync(text);
        file.writeTextSync("\n");
      });
    }
    #withFileForWritingSync(options, action) {
      const file = this.#openFileForWritingSync(options);
      try {
        return action(file);
      } finally {
        try {
          file.close();
        } catch {
          // ignore
        }
      }
    }
    #openFileForWritingSync(options) {
      try {
        return this.openSync({
          write: true,
          create: true,
          truncate: true,
          ...options,
        });
      } catch (err) {
        if (err instanceof Deno.errors.NotFound) {
          // attempt to create the parent directory when it doesn't exist
          const parent = this.resolve().parent();
          if (parent != null) {
            try {
              parent.mkdirSync();
            } catch {
              throw err; // throw the original error
            }
          }
          return this.openSync({
            write: true,
            create: true,
            truncate: true,
            ...options,
          });
        } else {
          throw err;
        }
      }
    }
    async chmod(mode) {
      await Deno.chmod(this.#path, mode);
      return this;
    }
    chmodSync(mode) {
      Deno.chmodSync(this.#path, mode);
      return this;
    }
    async chown(uid, gid) {
      await Deno.chown(this.#path, uid, gid);
      return this;
    }
    chownSync(uid, gid) {
      Deno.chownSync(this.#path, uid, gid);
      return this;
    }
    create() {
      return Deno.create(this.#path).then((file) => new FsFileWrapper(file));
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
    open(options) {
      return Deno.open(this.#path, options).then((file) => new FsFileWrapper(file));
    }
    openSync(options) {
      return new FsFileWrapper(Deno.openSync(this.#path, options));
    }
    async remove(options) {
      await Deno.remove(this.#path, options);
      return this;
    }
    removeSync(options) {
      Deno.removeSync(this.#path, options);
      return this;
    }
    async emptyDir() {
      await pack3.fs.emptyDir(this.toString());
      return this;
    }
    emptyDirSync() {
      pack3.fs.emptyDirSync(this.toString());
      return this;
    }
    copyFile(destinationPath) {
      const pathRef = ensurePathRef(destinationPath);
      return Deno.copyFile(this.#path, pathRef.#path).then(() => pathRef);
    }
    copyFileSync(destinationPath) {
      const pathRef = ensurePathRef(destinationPath);
      Deno.copyFileSync(this.#path, pathRef.#path);
      return pathRef;
    }
    rename(newPath) {
      const pathRef = ensurePathRef(newPath);
      return Deno.rename(this.#path, pathRef.#path).then(() => pathRef);
    }
    renameSync(newPath) {
      const pathRef = ensurePathRef(newPath);
      Deno.renameSync(this.#path, pathRef.#path);
      return pathRef;
    }
    async pipeTo(dest, options) {
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
      return this;
    }
  }
  function ensurePathRef(path) {
    return path instanceof PathRef ? path : new PathRef(path);
  }
  async function createSymlink(opts) {
    let kind = opts.type;
    if (kind == null && Deno.build.os === "windows") {
      const info = await opts.targetPath.lstat();
      if (info?.isDirectory) {
        kind = "dir";
      } else if (info?.isFile) {
        kind = "file";
      } else {
        throw new Deno.errors.NotFound(
          `The target path '${opts.targetPath}' did not exist or path kind could not be determined. ` +
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
  function createSymlinkSync(opts) {
    let kind = opts.type;
    if (kind == null && Deno.build.os === "windows") {
      const info = opts.targetPath.lstatSync();
      if (info?.isDirectory) {
        kind = "dir";
      } else if (info?.isFile) {
        kind = "file";
      } else {
        throw new Deno.errors.NotFound(
          `The target path '${opts.targetPath}' did not exist or path kind could not be determined. ` +
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
  class FsFileWrapper {
    #file;
    constructor(file) {
      this.#file = file;
    }
    get inner() {
      return this.#file;
    }
    writeText(text) {
      return this.writeBytes(new TextEncoder().encode(text));
    }
    writeTextSync(text) {
      return this.writeBytesSync(new TextEncoder().encode(text));
    }
    async writeBytes(bytes) {
      await pack3.writeAll(this.#file, bytes);
      return this;
    }
    writeBytesSync(bytes) {
      pack3.writeAllSync(this.#file, bytes);
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
    write(p) {
      return this.#file.write(p);
    }
    writeSync(p) {
      return this.#file.writeSync(p);
    }
    truncate(len) {
      return this.#file.truncate(len);
    }
    truncateSync(len) {
      return this.#file.truncateSync(len);
    }
    read(p) {
      return this.#file.read(p);
    }
    readSync(p) {
      return this.#file.readSync(p);
    }
    seek(offset, whence) {
      return this.#file.seek(offset, whence);
    }
    seekSync(offset, whence) {
      return this.#file.seekSync(offset, whence);
    }
    stat() {
      return this.#file.stat();
    }
    statSync() {
      return this.#file.statSync();
    }
    close() {
      return this.#file.close();
    }
  }
  async function notFoundToUndefined(action) {
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
  function notFoundToUndefinedSync(action) {
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
  Object.defineProperty(pack6, "createPathRef", {
    get: () => createPathRef,
  });
  Object.defineProperty(pack6, "PathRef", {
    get: () => PathRef,
  });
  Object.defineProperty(pack6, "FsFileWrapper", {
    get: () => FsFileWrapper,
  });
})();
(function _src_request_ts() {
  const withProgressBarFactorySymbol = Symbol();
  class RequestBuilder {
    #state = undefined;
    #getClonedState() {
      const state = this.#state;
      if (state == null) {
        return this.#getDefaultState();
      }
      return {
        // be explicit here in order to force evaluation
        // of each property on a case by case basis
        noThrow: typeof state.noThrow === "boolean" ? state.noThrow : [
          ...state.noThrow,
        ],
        url: state.url,
        body: state.body,
        cache: state.cache,
        headers: state.headers,
        integrity: state.integrity,
        keepalive: state.keepalive,
        method: state.method,
        mode: state.mode,
        redirect: state.redirect,
        referrer: state.referrer,
        referrerPolicy: state.referrerPolicy,
        progressBarFactory: state.progressBarFactory,
        progressOptions: state.progressOptions == null ? undefined : {
          ...state.progressOptions,
        },
        timeout: state.timeout,
      };
    }
    #getDefaultState() {
      return {
        noThrow: false,
        url: undefined,
        body: undefined,
        cache: undefined,
        headers: {},
        integrity: undefined,
        keepalive: undefined,
        method: undefined,
        mode: undefined,
        redirect: undefined,
        referrer: undefined,
        referrerPolicy: undefined,
        progressBarFactory: undefined,
        progressOptions: undefined,
        timeout: undefined,
      };
    }
    #newWithState(action) {
      const builder = new RequestBuilder();
      const state = this.#getClonedState();
      action(state);
      builder.#state = state;
      return builder;
    }
    then(onfulfilled, onrejected) {
      return this.fetch().then(onfulfilled).catch(onrejected);
    }
    fetch() {
      return makeRequest(this.#getClonedState());
    }
    url(value) {
      return this.#newWithState((state) => {
        state.url = value;
      });
    }
    header(nameOrItems, value) {
      return this.#newWithState((state) => {
        if (typeof nameOrItems === "string") {
          setHeader(state, nameOrItems, value);
        } else {
          for (const [name, value] of Object.entries(nameOrItems)) {
            setHeader(state, name, value);
          }
        }
      });
      function setHeader(state, name, value) {
        name = name.toUpperCase(); // case insensitive
        state.headers[name] = value;
      }
    }
    noThrow(value, ...additional) {
      return this.#newWithState((state) => {
        if (typeof value === "boolean" || value == null) {
          state.noThrow = value ?? true;
        } else {
          state.noThrow = [
            value,
            ...additional,
          ];
        }
      });
    }
    body(value) {
      return this.#newWithState((state) => {
        state.body = value;
      });
    }
    cache(value) {
      return this.#newWithState((state) => {
        state.cache = value;
      });
    }
    integrity(value) {
      return this.#newWithState((state) => {
        state.integrity = value;
      });
    }
    keepalive(value) {
      return this.#newWithState((state) => {
        state.keepalive = value;
      });
    }
    method(value) {
      return this.#newWithState((state) => {
        state.method = value;
      });
    }
    mode(value) {
      return this.#newWithState((state) => {
        state.mode = value;
      });
    }
    [withProgressBarFactorySymbol](factory) {
      return this.#newWithState((state) => {
        state.progressBarFactory = factory;
      });
    }
    redirect(value) {
      return this.#newWithState((state) => {
        state.redirect = value;
      });
    }
    referrer(value) {
      return this.#newWithState((state) => {
        state.referrer = value;
      });
    }
    referrerPolicy(value) {
      return this.#newWithState((state) => {
        state.referrerPolicy = value;
      });
    }
    showProgress(value) {
      return this.#newWithState((state) => {
        if (value === true || value == null) {
          state.progressOptions = {
            noClear: false,
          };
        } else if (value === false) {
          state.progressOptions = undefined;
        } else {
          state.progressOptions = {
            noClear: value.noClear ?? false,
          };
        }
      });
    }
    timeout(delay) {
      return this.#newWithState((state) => {
        state.timeout = delay == null ? undefined : pack1.delayToMs(delay);
      });
    }
    async arrayBuffer() {
      const response = await this.fetch();
      return response.arrayBuffer();
    }
    async blob() {
      const response = await this.fetch();
      return response.blob();
    }
    async formData() {
      const response = await this.fetch();
      return response.formData();
    }
    async json() {
      let builder = this;
      const acceptHeaderName = "ACCEPT";
      if (builder.#state == null || !Object.hasOwn(builder.#state.headers, acceptHeaderName)) {
        builder = builder.header(acceptHeaderName, "application/json");
      }
      const response = await builder.fetch();
      return response.json();
    }
    async text() {
      const response = await this.fetch();
      return response.text();
    }
    async pipeTo(dest, options) {
      const response = await this.fetch();
      return await response.pipeTo(dest, options);
    }
    async pipeToPath(filePathOrOptions, maybeOptions) {
      // Do not derive from the response url because that could cause the server
      // to be able to overwrite whatever file it wants locally, which would be
      // a security issue.
      // Additionally, resolve the path immediately in case the user changes their cwd
      // while the response is being fetched.
      const { filePath, options } = resolvePipeToPathParams(filePathOrOptions, maybeOptions, this.#state?.url);
      const response = await this.fetch();
      return await response.pipeToPath(filePath, options);
    }
    async pipeThrough(transform) {
      const response = await this.fetch();
      return response.pipeThrough(transform);
    }
  }
  class RequestResult {
    #response;
    #downloadResponse;
    #originalUrl;
    constructor(opts) {
      this.#originalUrl = opts.originalUrl;
      this.#response = opts.response;
      if (opts.progressBar != null) {
        const pb = opts.progressBar;
        this.#downloadResponse = new Response(
          new ReadableStream({
            async start(controller) {
              const reader = opts.response.body?.getReader();
              if (reader == null) {
                return;
              }
              try {
                while (true) {
                  const { done, value } = await reader.read();
                  if (done || value == null) break;
                  pb.increment(value.byteLength);
                  controller.enqueue(value);
                }
                controller.close();
              } finally {
                reader.releaseLock();
                pb.finish();
              }
            },
          }),
        );
      } else {
        this.#downloadResponse = opts.response;
      }
    }
    get response() {
      return this.#response;
    }
    get headers() {
      return this.#response.headers;
    }
    get ok() {
      return this.#response.ok;
    }
    get redirected() {
      return this.#response.redirected;
    }
    get status() {
      return this.#response.status;
    }
    get statusText() {
      return this.#response.statusText;
    }
    get url() {
      return this.#response.url;
    }
    throwIfNotOk() {
      if (!this.ok) {
        this.#response.body?.cancel().catch(() => {
          // ignore
        });
        throw new Error(`Error making request to ${this.#originalUrl}: ${this.statusText}`);
      }
    }
    async arrayBuffer() {
      if (this.#response.status === 404) {
        await this.#response.body?.cancel();
        return undefined;
      }
      return this.#downloadResponse.arrayBuffer();
    }
    async blob() {
      if (this.#response.status === 404) {
        await this.#response.body?.cancel();
        return undefined;
      }
      return this.#downloadResponse.blob();
    }
    async formData() {
      if (this.#response.status === 404) {
        await this.#response.body?.cancel();
        return undefined;
      }
      return this.#downloadResponse.formData();
    }
    async json() {
      if (this.#response.status === 404) {
        await this.#response.body?.cancel();
        return undefined;
      }
      return this.#downloadResponse.json();
    }
    async text() {
      if (this.#response.status === 404) {
        // most people don't need to bother with this and if they do, they will
        // need to opt-in with `noThrow()`. So just assert non-nullable
        // to make it easier to work with and highlight this behaviour in the jsdocs.
        await this.#response.body?.cancel();
        return undefined;
      }
      return this.#downloadResponse.text();
    }
    pipeTo(dest, options) {
      return this.#getDownloadBody().pipeTo(dest, options);
    }
    async pipeToPath(filePathOrOptions, maybeOptions) {
      // resolve the file path using the original url because it would be a security issue
      // to allow the server to select which file path to save the file to if using the
      // response url
      const { filePath, options } = resolvePipeToPathParams(filePathOrOptions, maybeOptions, this.#originalUrl);
      const body = this.#getDownloadBody();
      try {
        const file = await filePath.open({
          write: true,
          create: true,
          ...options ?? {},
        });
        try {
          await body.pipeTo(file.writable, {
            preventClose: true,
          });
        } finally {
          try {
            file.close();
          } catch {
            // do nothing
          }
        }
      } catch (err) {
        await this.#response.body?.cancel();
        throw err;
      }
      return filePath;
    }
    pipeThrough(transform) {
      return this.#getDownloadBody().pipeThrough(transform);
    }
    #getDownloadBody() {
      const body = this.#downloadResponse.body;
      if (body == null) {
        throw new Error("Response had no body.");
      }
      return body;
    }
  }
  async function makeRequest(state) {
    if (state.url == null) {
      throw new Error("You must specify a URL before fetching.");
    }
    const timeout = getTimeout();
    const response = await fetch(state.url, {
      body: state.body,
      cache: state.cache,
      headers: pack1.filterEmptyRecordValues(state.headers),
      integrity: state.integrity,
      keepalive: state.keepalive,
      method: state.method,
      mode: state.mode,
      redirect: state.redirect,
      referrer: state.referrer,
      referrerPolicy: state.referrerPolicy,
      signal: timeout?.signal,
    });
    timeout?.clear();
    const result = new RequestResult({
      response,
      originalUrl: state.url.toString(),
      progressBar: getProgressBar(),
    });
    if (!state.noThrow) {
      result.throwIfNotOk();
    } else if (state.noThrow instanceof Array) {
      if (!state.noThrow.includes(response.status)) {
        result.throwIfNotOk();
      }
    }
    return result;
    function getProgressBar() {
      if (state.progressOptions == null || state.progressBarFactory == null) {
        return undefined;
      }
      return state.progressBarFactory(`Download ${state.url}`).noClear(state.progressOptions.noClear).kind("bytes")
        .length(getContentLength());
      function getContentLength() {
        const contentLength = response.headers.get("content-length");
        if (contentLength == null) {
          return undefined;
        }
        const length = parseInt(contentLength, 10);
        return isNaN(length) ? undefined : length;
      }
    }
    function getTimeout() {
      if (state.timeout == null) {
        return undefined;
      }
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), state.timeout);
      return {
        signal: controller.signal,
        clear() {
          clearTimeout(timeoutId);
        },
      };
    }
  }
  function resolvePipeToPathParams(pathOrOptions, maybeOptions, originalUrl) {
    let filePath;
    let options;
    if (typeof pathOrOptions === "string" || pathOrOptions instanceof URL) {
      filePath = new pack6.PathRef(pathOrOptions).resolve();
      options = maybeOptions;
    } else if (pathOrOptions instanceof pack6.PathRef) {
      filePath = pathOrOptions.resolve();
      options = maybeOptions;
    } else if (typeof pathOrOptions === "object") {
      options = pathOrOptions;
    } else if (pathOrOptions === undefined) {
      options = maybeOptions;
    }
    if (filePath === undefined) {
      filePath = new pack6.PathRef(getFileNameFromUrlOrThrow(originalUrl));
    } else if (filePath.isDir()) {
      filePath = filePath.join(getFileNameFromUrlOrThrow(originalUrl));
    }
    filePath = filePath.resolve();
    return {
      filePath,
      options,
    };
    function getFileNameFromUrlOrThrow(url) {
      const fileName = url == null ? undefined : pack1.getFileNameFromUrl(url);
      if (fileName == null) {
        throw new Error("Could not derive the path from the request URL. " + "Please explicitly provide a path.");
      }
      return fileName;
    }
  }
  Object.defineProperty(pack5, "withProgressBarFactorySymbol", {
    get: () => withProgressBarFactorySymbol,
  });
  Object.defineProperty(pack5, "RequestBuilder", {
    get: () => RequestBuilder,
  });
  Object.defineProperty(pack5, "RequestResult", {
    get: () => RequestResult,
  });
  Object.defineProperty(pack5, "makeRequest", {
    get: () => makeRequest,
  });
})();
(function _src_lib_rs_lib_generated_js() {
  // @generated file from wasmbuild -- do not edit
  // deno-lint-ignore-file
  // deno-fmt-ignore-file
  // source-hash: 63a2d99dd4ae419de402675f8f80f5136d66d83b
  let wasm;
  const heap = new Array(32).fill(undefined);
  heap.push(undefined, null, true, false);
  function getObject(idx) {
    return heap[idx];
  }
  let heap_next = heap.length;
  function dropObject(idx) {
    if (idx < 36) return;
    heap[idx] = heap_next;
    heap_next = idx;
  }
  function takeObject(idx) {
    const ret = getObject(idx);
    dropObject(idx);
    return ret;
  }
  const cachedTextDecoder = new TextDecoder("utf-8", {
    ignoreBOM: true,
    fatal: true,
  });
  cachedTextDecoder.decode();
  let cachedUint8Memory0 = new Uint8Array();
  function getUint8Memory0() {
    if (cachedUint8Memory0.byteLength === 0) {
      cachedUint8Memory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8Memory0;
  }
  function getStringFromWasm0(ptr, len) {
    return cachedTextDecoder.decode(getUint8Memory0().subarray(ptr, ptr + len));
  }
  function addHeapObject(obj) {
    if (heap_next === heap.length) heap.push(heap.length + 1);
    const idx = heap_next;
    heap_next = heap[idx];
    heap[idx] = obj;
    return idx;
  }
  function isLikeNone(x) {
    return x === undefined || x === null;
  }
  let cachedFloat64Memory0 = new Float64Array();
  function getFloat64Memory0() {
    if (cachedFloat64Memory0.byteLength === 0) {
      cachedFloat64Memory0 = new Float64Array(wasm.memory.buffer);
    }
    return cachedFloat64Memory0;
  }
  let cachedInt32Memory0 = new Int32Array();
  function getInt32Memory0() {
    if (cachedInt32Memory0.byteLength === 0) {
      cachedInt32Memory0 = new Int32Array(wasm.memory.buffer);
    }
    return cachedInt32Memory0;
  }
  let WASM_VECTOR_LEN = 0;
  const cachedTextEncoder = new TextEncoder("utf-8");
  const encodeString = function (arg, view) {
    return cachedTextEncoder.encodeInto(arg, view);
  };
  function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === undefined) {
      const buf = cachedTextEncoder.encode(arg);
      const ptr = malloc(buf.length);
      getUint8Memory0().subarray(ptr, ptr + buf.length).set(buf);
      WASM_VECTOR_LEN = buf.length;
      return ptr;
    }
    let len = arg.length;
    let ptr = malloc(len);
    const mem = getUint8Memory0();
    let offset = 0;
    for (; offset < len; offset++) {
      const code = arg.charCodeAt(offset);
      if (code > 0x7F) break;
      mem[ptr + offset] = code;
    }
    if (offset !== len) {
      if (offset !== 0) {
        arg = arg.slice(offset);
      }
      ptr = realloc(ptr, len, len = offset + arg.length * 3);
      const view = getUint8Memory0().subarray(ptr + offset, ptr + len);
      const ret = encodeString(arg, view);
      offset += ret.written;
    }
    WASM_VECTOR_LEN = offset;
    return ptr;
  }
  let cachedBigInt64Memory0 = new BigInt64Array();
  function getBigInt64Memory0() {
    if (cachedBigInt64Memory0.byteLength === 0) {
      cachedBigInt64Memory0 = new BigInt64Array(wasm.memory.buffer);
    }
    return cachedBigInt64Memory0;
  }
  function debugString(val) {
    // primitive types
    const type = typeof val;
    if (type == "number" || type == "boolean" || val == null) {
      return `${val}`;
    }
    if (type == "string") {
      return `"${val}"`;
    }
    if (type == "symbol") {
      const description = val.description;
      if (description == null) {
        return "Symbol";
      } else {
        return `Symbol(${description})`;
      }
    }
    if (type == "function") {
      const name = val.name;
      if (typeof name == "string" && name.length > 0) {
        return `Function(${name})`;
      } else {
        return "Function";
      }
    }
    // objects
    if (Array.isArray(val)) {
      const length = val.length;
      let debug = "[";
      if (length > 0) {
        debug += debugString(val[0]);
      }
      for (let i = 1; i < length; i++) {
        debug += ", " + debugString(val[i]);
      }
      debug += "]";
      return debug;
    }
    // Test for built-in
    const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val));
    let className;
    if (builtInMatches.length > 1) {
      className = builtInMatches[1];
    } else {
      // Failed to match the standard '[object ClassName]'
      return toString.call(val);
    }
    if (className == "Object") {
      // we're a user defined class or Object
      // JSON.stringify avoids problems with cycles, and is generally much
      // easier than looping through ownProperties of `val`.
      try {
        return "Object(" + JSON.stringify(val) + ")";
      } catch (_) {
        return "Object";
      }
    }
    // errors
    if (val instanceof Error) {
      return `${val.name}: ${val.message}\n${val.stack}`;
    }
    // TODO we could test for more things here, like `Set`s and `Map`s.
    return className;
  }
  function parse(command) {
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
      const ptr0 = passStringToWasm0(command, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
      const len0 = WASM_VECTOR_LEN;
      wasm.parse(retptr, ptr0, len0);
      var r0 = getInt32Memory0()[retptr / 4 + 0];
      var r1 = getInt32Memory0()[retptr / 4 + 1];
      var r2 = getInt32Memory0()[retptr / 4 + 2];
      if (r2) {
        throw takeObject(r1);
      }
      return takeObject(r0);
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
    }
  }
  function static_text_render_text(items, cols, rows) {
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
      wasm.static_text_render_text(retptr, addHeapObject(items), cols, rows);
      var r0 = getInt32Memory0()[retptr / 4 + 0];
      var r1 = getInt32Memory0()[retptr / 4 + 1];
      var r2 = getInt32Memory0()[retptr / 4 + 2];
      var r3 = getInt32Memory0()[retptr / 4 + 3];
      if (r3) {
        throw takeObject(r2);
      }
      let v0;
      if (r0 !== 0) {
        v0 = getStringFromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
      }
      return v0;
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
    }
  }
  function static_text_clear_text(cols, rows) {
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
      wasm.static_text_clear_text(retptr, cols, rows);
      var r0 = getInt32Memory0()[retptr / 4 + 0];
      var r1 = getInt32Memory0()[retptr / 4 + 1];
      let v0;
      if (r0 !== 0) {
        v0 = getStringFromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
      }
      return v0;
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
    }
  }
  function static_text_render_once(items, cols, rows) {
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
      wasm.static_text_render_once(retptr, addHeapObject(items), cols, rows);
      var r0 = getInt32Memory0()[retptr / 4 + 0];
      var r1 = getInt32Memory0()[retptr / 4 + 1];
      var r2 = getInt32Memory0()[retptr / 4 + 2];
      var r3 = getInt32Memory0()[retptr / 4 + 3];
      if (r3) {
        throw takeObject(r2);
      }
      let v0;
      if (r0 !== 0) {
        v0 = getStringFromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1);
      }
      return v0;
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
    }
  }
  function strip_ansi_codes(text) {
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
      const ptr0 = passStringToWasm0(text, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
      const len0 = WASM_VECTOR_LEN;
      wasm.strip_ansi_codes(retptr, ptr0, len0);
      var r0 = getInt32Memory0()[retptr / 4 + 0];
      var r1 = getInt32Memory0()[retptr / 4 + 1];
      return getStringFromWasm0(r0, r1);
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
      wasm.__wbindgen_free(r0, r1);
    }
  }
  function handleError(f, args) {
    try {
      return f.apply(this, args);
    } catch (e) {
      wasm.__wbindgen_exn_store(addHeapObject(e));
    }
  }
  const imports = {
    __wbindgen_placeholder__: {
      __wbindgen_object_drop_ref: function (arg0) {
        takeObject(arg0);
      },
      __wbindgen_error_new: function (arg0, arg1) {
        const ret = new Error(getStringFromWasm0(arg0, arg1));
        return addHeapObject(ret);
      },
      __wbindgen_boolean_get: function (arg0) {
        const v = getObject(arg0);
        const ret = typeof v === "boolean" ? v ? 1 : 0 : 2;
        return ret;
      },
      __wbindgen_is_bigint: function (arg0) {
        const ret = typeof getObject(arg0) === "bigint";
        return ret;
      },
      __wbindgen_bigint_from_i64: function (arg0) {
        const ret = arg0;
        return addHeapObject(ret);
      },
      __wbindgen_jsval_eq: function (arg0, arg1) {
        const ret = getObject(arg0) === getObject(arg1);
        return ret;
      },
      __wbindgen_number_get: function (arg0, arg1) {
        const obj = getObject(arg1);
        const ret = typeof obj === "number" ? obj : undefined;
        getFloat64Memory0()[arg0 / 8 + 1] = isLikeNone(ret) ? 0 : ret;
        getInt32Memory0()[arg0 / 4 + 0] = !isLikeNone(ret);
      },
      __wbindgen_string_get: function (arg0, arg1) {
        const obj = getObject(arg1);
        const ret = typeof obj === "string" ? obj : undefined;
        var ptr0 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        getInt32Memory0()[arg0 / 4 + 1] = len0;
        getInt32Memory0()[arg0 / 4 + 0] = ptr0;
      },
      __wbindgen_is_object: function (arg0) {
        const val = getObject(arg0);
        const ret = typeof val === "object" && val !== null;
        return ret;
      },
      __wbindgen_in: function (arg0, arg1) {
        const ret = getObject(arg0) in getObject(arg1);
        return ret;
      },
      __wbindgen_bigint_from_u64: function (arg0) {
        const ret = BigInt.asUintN(64, arg0);
        return addHeapObject(ret);
      },
      __wbindgen_object_clone_ref: function (arg0) {
        const ret = getObject(arg0);
        return addHeapObject(ret);
      },
      __wbindgen_string_new: function (arg0, arg1) {
        const ret = getStringFromWasm0(arg0, arg1);
        return addHeapObject(ret);
      },
      __wbindgen_jsval_loose_eq: function (arg0, arg1) {
        const ret = getObject(arg0) == getObject(arg1);
        return ret;
      },
      __wbg_set_20cbc34131e76824: function (arg0, arg1, arg2) {
        getObject(arg0)[takeObject(arg1)] = takeObject(arg2);
      },
      __wbg_get_57245cc7d7c7619d: function (arg0, arg1) {
        const ret = getObject(arg0)[arg1 >>> 0];
        return addHeapObject(ret);
      },
      __wbg_length_6e3bbe7c8bd4dbd8: function (arg0) {
        const ret = getObject(arg0).length;
        return ret;
      },
      __wbg_new_1d9a920c6bfc44a8: function () {
        const ret = new Array();
        return addHeapObject(ret);
      },
      __wbindgen_is_function: function (arg0) {
        const ret = typeof getObject(arg0) === "function";
        return ret;
      },
      __wbg_next_579e583d33566a86: function (arg0) {
        const ret = getObject(arg0).next;
        return addHeapObject(ret);
      },
      __wbg_next_aaef7c8aa5e212ac: function () {
        return handleError(function (arg0) {
          const ret = getObject(arg0).next();
          return addHeapObject(ret);
        }, arguments);
      },
      __wbg_done_1b73b0672e15f234: function (arg0) {
        const ret = getObject(arg0).done;
        return ret;
      },
      __wbg_value_1ccc36bc03462d71: function (arg0) {
        const ret = getObject(arg0).value;
        return addHeapObject(ret);
      },
      __wbg_iterator_6f9d4f28845f426c: function () {
        const ret = Symbol.iterator;
        return addHeapObject(ret);
      },
      __wbg_get_765201544a2b6869: function () {
        return handleError(function (arg0, arg1) {
          const ret = Reflect.get(getObject(arg0), getObject(arg1));
          return addHeapObject(ret);
        }, arguments);
      },
      __wbg_call_97ae9d8645dc388b: function () {
        return handleError(function (arg0, arg1) {
          const ret = getObject(arg0).call(getObject(arg1));
          return addHeapObject(ret);
        }, arguments);
      },
      __wbg_new_0b9bfdd97583284e: function () {
        const ret = new Object();
        return addHeapObject(ret);
      },
      __wbg_set_a68214f35c417fa9: function (arg0, arg1, arg2) {
        getObject(arg0)[arg1 >>> 0] = takeObject(arg2);
      },
      __wbg_isArray_27c46c67f498e15d: function (arg0) {
        const ret = Array.isArray(getObject(arg0));
        return ret;
      },
      __wbg_instanceof_ArrayBuffer_e5e48f4762c5610b: function (arg0) {
        let result;
        try {
          result = getObject(arg0) instanceof ArrayBuffer;
        } catch {
          result = false;
        }
        const ret = result;
        return ret;
      },
      __wbg_isSafeInteger_dfa0593e8d7ac35a: function (arg0) {
        const ret = Number.isSafeInteger(getObject(arg0));
        return ret;
      },
      __wbg_entries_65a76a413fc91037: function (arg0) {
        const ret = Object.entries(getObject(arg0));
        return addHeapObject(ret);
      },
      __wbg_buffer_3f3d764d4747d564: function (arg0) {
        const ret = getObject(arg0).buffer;
        return addHeapObject(ret);
      },
      __wbg_new_8c3f0052272a457a: function (arg0) {
        const ret = new Uint8Array(getObject(arg0));
        return addHeapObject(ret);
      },
      __wbg_set_83db9690f9353e79: function (arg0, arg1, arg2) {
        getObject(arg0).set(getObject(arg1), arg2 >>> 0);
      },
      __wbg_length_9e1ae1900cb0fbd5: function (arg0) {
        const ret = getObject(arg0).length;
        return ret;
      },
      __wbg_instanceof_Uint8Array_971eeda69eb75003: function (arg0) {
        let result;
        try {
          result = getObject(arg0) instanceof Uint8Array;
        } catch {
          result = false;
        }
        const ret = result;
        return ret;
      },
      __wbg_new_abda76e883ba8a5f: function () {
        const ret = new Error();
        return addHeapObject(ret);
      },
      __wbg_stack_658279fe44541cf6: function (arg0, arg1) {
        const ret = getObject(arg1).stack;
        const ptr0 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        getInt32Memory0()[arg0 / 4 + 1] = len0;
        getInt32Memory0()[arg0 / 4 + 0] = ptr0;
      },
      __wbg_error_f851667af71bcfc6: function (arg0, arg1) {
        try {
          console.error(getStringFromWasm0(arg0, arg1));
        } finally {
          wasm.__wbindgen_free(arg0, arg1);
        }
      },
      __wbindgen_bigint_get_as_i64: function (arg0, arg1) {
        const v = getObject(arg1);
        const ret = typeof v === "bigint" ? v : undefined;
        getBigInt64Memory0()[arg0 / 8 + 1] = isLikeNone(ret) ? 0n : ret;
        getInt32Memory0()[arg0 / 4 + 0] = !isLikeNone(ret);
      },
      __wbindgen_debug_string: function (arg0, arg1) {
        const ret = debugString(getObject(arg1));
        const ptr0 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        getInt32Memory0()[arg0 / 4 + 1] = len0;
        getInt32Memory0()[arg0 / 4 + 0] = ptr0;
      },
      __wbindgen_throw: function (arg0, arg1) {
        throw new Error(getStringFromWasm0(arg0, arg1));
      },
      __wbindgen_memory: function () {
        const ret = wasm.memory;
        return addHeapObject(ret);
      },
    },
  };
  async function instantiate(opts) {
    return (await instantiateWithInstance(opts)).exports;
  }
  let instanceWithExports;
  let lastLoadPromise;
  function instantiateWithInstance(opts) {
    if (instanceWithExports != null) {
      return Promise.resolve(instanceWithExports);
    }
    if (lastLoadPromise == null) {
      lastLoadPromise = (async () => {
        try {
          const instance = (await instantiateModule(opts ?? {})).instance;
          wasm = instance.exports;
          cachedInt32Memory0 = new Int32Array(wasm.memory.buffer);
          cachedUint8Memory0 = new Uint8Array(wasm.memory.buffer);
          instanceWithExports = {
            instance,
            exports: getWasmInstanceExports(),
          };
          return instanceWithExports;
        } finally {
          lastLoadPromise = null;
        }
      })();
    }
    return lastLoadPromise;
  }
  function getWasmInstanceExports() {
    return {
      parse,
      static_text_render_text,
      static_text_clear_text,
      static_text_render_once,
      strip_ansi_codes,
    };
  }
  function isInstantiated() {
    return instanceWithExports != null;
  }
  async function instantiateModule(opts) {
    const wasmUrl = opts.url ?? new URL("rs_lib_bg.wasm", import.meta.url);
    const decompress = opts.decompress;
    const isFile = wasmUrl.protocol === "file:";
    // make file urls work in Node via dnt
    const isNode = globalThis.process?.versions?.node != null;
    if (isNode && isFile) {
      // the deno global will be shimmed by dnt
      const wasmCode = await Deno.readFile(wasmUrl);
      return WebAssembly.instantiate(decompress ? decompress(wasmCode) : wasmCode, imports);
    }
    switch (wasmUrl.protocol) {
      case "file:":
      case "https:":
      case "http:": {
        if (isFile) {
          if (typeof Deno !== "object") {
            throw new Error("file urls are not supported in this environment");
          }
          if ("permissions" in Deno) {
            await Deno.permissions.request({
              name: "read",
              path: wasmUrl,
            });
          }
        } else if (typeof Deno === "object" && "permissions" in Deno) {
          await Deno.permissions.request({
            name: "net",
            host: wasmUrl.host,
          });
        }
        const wasmResponse = await fetch(wasmUrl);
        if (decompress) {
          const wasmCode = new Uint8Array(await wasmResponse.arrayBuffer());
          return WebAssembly.instantiate(decompress(wasmCode), imports);
        }
        if (isFile || wasmResponse.headers.get("content-type")?.toLowerCase().startsWith("application/wasm")) {
          return WebAssembly.instantiateStreaming(wasmResponse, imports);
        } else {
          return WebAssembly.instantiate(await wasmResponse.arrayBuffer(), imports);
        }
      }
      default:
        throw new Error(`Unsupported protocol: ${wasmUrl.protocol}`);
    }
  }
  Object.defineProperty(pack47, "parse", {
    get: () => parse,
  });
  Object.defineProperty(pack47, "static_text_render_text", {
    get: () => static_text_render_text,
  });
  Object.defineProperty(pack47, "static_text_clear_text", {
    get: () => static_text_clear_text,
  });
  Object.defineProperty(pack47, "static_text_render_once", {
    get: () => static_text_render_once,
  });
  Object.defineProperty(pack47, "strip_ansi_codes", {
    get: () => strip_ansi_codes,
  });
  Object.defineProperty(pack47, "instantiate", {
    get: () => instantiate,
  });
  Object.defineProperty(pack47, "instantiateWithInstance", {
    get: () => instantiateWithInstance,
  });
  Object.defineProperty(pack47, "isInstantiated", {
    get: () => isInstantiated,
  });
})();
await (async function _src_lib_mod_ts() {
  async function getWasmFileUrl() {
    const url = new URL("rs_lib_bg.wasm", import.meta.url);
    if (url.protocol !== "file:") {
      return await cacheLocalDir(url) ?? url;
    }
    return url;
  }
  async function cacheLocalDir(url) {
    const localPath = await getUrlLocalPath(url);
    if (localPath == null) {
      return undefined;
    }
    if (!await pack3.fs.exists(localPath)) {
      const fileBytes = await getUrlBytes(url);
      await Deno.writeFile(localPath, new Uint8Array(fileBytes));
    }
    return pack3.path.toFileUrl(localPath);
  }
  async function getUrlLocalPath(url) {
    try {
      const dataDirPath = await getInitializedLocalDataDirPath();
      const version = getUrlVersion(url);
      return pack3.path.join(dataDirPath, version + ".wasm");
    } catch {
      return undefined;
    }
  }
  async function getInitializedLocalDataDirPath() {
    const dataDir = pack3.localDataDir();
    if (dataDir == null) {
      throw new Error(`Could not find local data directory.`);
    }
    const dirPath = pack3.path.join(dataDir, "dax");
    await pack3.fs.ensureDir(dirPath);
    return dirPath;
  }
  function getUrlVersion(url) {
    const version = url.pathname.match(/([0-9]+)\.([0-9]+)\.([0-9]+)/)?.[0];
    if (version == null) {
      throw new Error(`Could not find version in url: ${url}`);
    }
    return version;
  }
  async function getUrlBytes(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Error downloading ${url}: ${response.statusText}`);
    }
    return await response.arrayBuffer();
  }
  const wasmInstance = await pack47.instantiate({
    url: await getWasmFileUrl(),
  });
  Object.defineProperty(pack4, "wasmInstance", {
    get: () => wasmInstance,
  });
})();
(function _src_deps_ts() {
  Object.defineProperty(pack3, "colors", {
    get: () => pack36,
  });
  Object.defineProperty(pack3, "fs", {
    get: () => pack37,
  });
  Object.defineProperty(pack3, "Buffer", {
    get: () => pack38.Buffer,
  });
  Object.defineProperty(pack3, "BufReader", {
    get: () => pack39.BufReader,
  });
  Object.defineProperty(pack3, "path", {
    get: () => pack40,
  });
  Object.defineProperty(pack3, "readAll", {
    get: () => pack41.readAll,
  });
  Object.defineProperty(pack3, "readerFromStreamReader", {
    get: () => pack42.readerFromStreamReader,
  });
  Object.defineProperty(pack3, "writeAll", {
    get: () => pack43.writeAll,
  });
  Object.defineProperty(pack3, "writeAllSync", {
    get: () => pack43.writeAllSync,
  });
  Object.defineProperty(pack3, "localDataDir", {
    get: () => pack44.default,
  });
  Object.defineProperty(pack3, "outdent", {
    get: () => pack45.outdent,
  });
  Object.defineProperty(pack3, "DenoWhichRealEnvironment", {
    get: () => pack46.RealEnvironment,
  });
  Object.defineProperty(pack3, "which", {
    get: () => pack46.which,
  });
  Object.defineProperty(pack3, "whichSync", {
    get: () => pack46.whichSync,
  });
})();
(function _src_console_select_ts() {
  function select(opts) {
    return maybeSelect(opts).then(pack29.resultOrExit);
  }
  function maybeSelect(opts) {
    if (opts.options.length <= 1) {
      throw new Error(`You must provide at least two options. (Prompt: '${opts.message}')`);
    }
    return pack29.createSelection({
      message: opts.message,
      noClear: opts.noClear,
      ...innerSelect(opts),
    });
  }
  function innerSelect(opts) {
    const drawState = {
      title: opts.message,
      activeIndex: (opts.initialIndex ?? 0) % opts.options.length,
      items: opts.options,
      hasCompleted: false,
    };
    return {
      render: () => render(drawState),
      onKey: (key) => {
        switch (key) {
          case pack29.Keys.Up:
            if (drawState.activeIndex === 0) {
              drawState.activeIndex = drawState.items.length - 1;
            } else {
              drawState.activeIndex--;
            }
            break;
          case pack29.Keys.Down:
            drawState.activeIndex = (drawState.activeIndex + 1) % drawState.items.length;
            break;
          case pack29.Keys.Enter:
            drawState.hasCompleted = true;
            return drawState.activeIndex;
        }
      },
    };
  }
  function render(state) {
    const items = [];
    items.push(pack3.colors.bold(pack3.colors.blue(state.title)));
    if (state.hasCompleted) {
      items.push({
        text: ` - ${state.items[state.activeIndex]}`,
        indent: 3,
      });
    } else {
      for (const [i, text] of state.items.entries()) {
        const prefix = i === state.activeIndex ? "> " : "  ";
        items.push({
          text: `${prefix}${text}`,
          indent: 4,
        });
      }
    }
    return items;
  }
  Object.defineProperty(pack34, "select", {
    get: () => select,
  });
  Object.defineProperty(pack34, "maybeSelect", {
    get: () => maybeSelect,
  });
  Object.defineProperty(pack34, "innerSelect", {
    get: () => innerSelect,
  });
})();
(function _src_console_prompt_ts() {
  const defaultMask = {
    char: "*",
    lastVisible: false,
  };
  function prompt(optsOrMessage, options) {
    return maybePrompt(optsOrMessage, options).then(pack29.resultOrExit);
  }
  function maybePrompt(optsOrMessage, options) {
    const opts = typeof optsOrMessage === "string"
      ? {
        message: optsOrMessage,
        ...options,
      }
      : optsOrMessage;
    return pack29.createSelection({
      message: opts.message,
      noClear: opts.noClear,
      ...innerPrompt(opts),
    });
  }
  function innerPrompt(opts) {
    let mask = opts.mask ?? false;
    if (mask && typeof mask === "boolean") {
      mask = defaultMask;
    }
    const drawState = {
      title: opts.message,
      inputText: opts.default ?? "",
      mask,
      hasCompleted: false,
    };
    return {
      render: () => render(drawState),
      onKey: (key) => {
        if (typeof key === "string") {
          drawState.inputText += key;
        } else {
          switch (key) {
            case pack29.Keys.Space:
              drawState.inputText += " ";
              break;
            case pack29.Keys.Backspace:
              drawState.inputText = drawState.inputText.slice(0, -1);
              break;
            case pack29.Keys.Enter:
              drawState.hasCompleted = true;
              return drawState.inputText;
          }
        }
        return undefined;
      },
    };
  }
  function render(state) {
    let { inputText } = state;
    if (state.mask) {
      const char = state.mask.char ?? defaultMask.char;
      const lastVisible = state.mask.lastVisible ?? defaultMask.lastVisible;
      const shouldShowLast = lastVisible && !state.hasCompleted;
      const safeLengthMinusOne = Math.max(0, inputText.length - 1);
      const masked = char.repeat(shouldShowLast ? safeLengthMinusOne : inputText.length);
      const unmasked = shouldShowLast ? inputText.slice(safeLengthMinusOne) : "";
      inputText = `${masked}${unmasked}`;
    }
    return [
      pack3.colors.bold(pack3.colors.blue(state.title)) + " " + inputText + (state.hasCompleted ? "" : "\u2588"),
    ];
  }
  Object.defineProperty(pack33, "prompt", {
    get: () => prompt,
  });
  Object.defineProperty(pack33, "maybePrompt", {
    get: () => maybePrompt,
  });
  Object.defineProperty(pack33, "innerPrompt", {
    get: () => innerPrompt,
  });
})();
(function _src_console_progress_format_ts() {
  const units = [
    "B",
    "KiB",
    "MiB",
    "GiB",
    "TiB",
    "PiB",
    "EiB",
    "ZiB",
    "YiB",
  ];
  function humanDownloadSize(byteCount, totalBytes) {
    const exponent = Math.min(units.length - 1, Math.floor(Math.log(totalBytes) / Math.log(1024)));
    const unit = units[exponent];
    const prettyBytes = (Math.floor(byteCount / Math.pow(1024, exponent) * 100) / 100).toFixed(exponent === 0 ? 0 : 2);
    return `${prettyBytes} ${unit}`;
  }
  Object.defineProperty(pack35, "humanDownloadSize", {
    get: () => humanDownloadSize,
  });
})();
(function _src_console_progress_mod_ts() {
  class ProgressBar {
    #state;
    #pb;
    #withCount = 0;
    #onLog;
    #noClear;
    constructor(onLog, opts) {
      if (arguments.length !== 2) {
        throw new Error("Invalid usage. Create the progress bar via `$.progress`.");
      }
      this.#onLog = onLog;
      this.#state = {
        message: opts.message,
        prefix: opts.prefix,
        length: opts.length,
        currentPos: 0,
        tickCount: 0,
        hasCompleted: false,
        kind: "raw",
      };
      this.#pb = pack25.addProgressBar((size) => {
        this.#state.tickCount++;
        return renderProgressBar(this.#state, size);
      });
      this.#noClear = opts.noClear ?? false;
      this.#logIfNonInteractive();
    }
    prefix(prefix) {
      this.#state.prefix = prefix;
      if (prefix != null && prefix.length > 0) {
        this.#logIfNonInteractive();
      }
      return this;
    }
    message(message) {
      this.#state.message = message;
      if (message != null && message.length > 0) {
        this.#logIfNonInteractive();
      }
      return this;
    }
    kind(kind) {
      this.#state.kind = kind;
      return this;
    }
    #logIfNonInteractive() {
      if (pack29.isOutputTty) {
        return;
      }
      let text = this.#state.prefix ?? "";
      if (text.length > 0) {
        text += " ";
      }
      text += this.#state.message ?? "";
      if (text.length > 0) {
        this.#onLog(text);
      }
    }
    position(position) {
      this.#state.currentPos = position;
      return this;
    }
    increment(inc = 1) {
      this.#state.currentPos += inc;
      return this;
    }
    length(size) {
      this.#state.length = size;
      return this;
    }
    noClear(value = true) {
      this.#noClear = value;
      return this;
    }
    forceRender() {
      return pack25.forceRender();
    }
    finish() {
      if (pack25.removeProgressBar(this.#pb)) {
        this.#state.hasCompleted = true;
        if (this.#noClear) {
          const text = renderProgressBar(this.#state, pack29.safeConsoleSize()).map((item) =>
            typeof item === "string" ? item : item.text
          ).join("\n");
          this.#onLog(text);
        }
      }
    }
    with(action) {
      this.#withCount++;
      let wasAsync = false;
      try {
        const result = action();
        if (result instanceof Promise) {
          wasAsync = true;
          return result.finally(() => {
            this.#decrementWith();
          });
        } else {
          return result;
        }
      } finally {
        if (!wasAsync) {
          this.#decrementWith();
        }
      }
    }
    #decrementWith() {
      this.#withCount--;
      if (this.#withCount === 0) {
        this.finish();
      }
    }
  }
  const tickStrings = [
    "⠋",
    "⠙",
    "⠹",
    "⠸",
    "⠼",
    "⠴",
    "⠦",
    "⠧",
    "⠇",
    "⠏",
  ];
  function renderProgressBar(state, size) {
    if (state.hasCompleted) {
      let text = "";
      if (state.prefix != null) {
        text += pack3.colors.green(state.prefix);
      }
      if (state.message != null) {
        if (text.length > 0) {
          text += " ";
        }
        text += state.message;
      }
      return text.length > 0
        ? [
          text,
        ]
        : [];
    } else if (state.length == null || state.length === 0) {
      let text = pack3.colors.green(tickStrings[Math.abs(state.tickCount) % tickStrings.length]);
      if (state.prefix != null) {
        text += ` ${pack3.colors.green(state.prefix)}`;
      }
      if (state.message != null) {
        text += ` ${state.message}`;
      }
      return [
        text,
      ];
    } else {
      let firstLine = "";
      if (state.prefix != null) {
        firstLine += pack3.colors.green(state.prefix);
      }
      if (state.message != null) {
        if (firstLine.length > 0) {
          firstLine += " ";
        }
        firstLine += state.message;
      }
      const percent = Math.min(state.currentPos / state.length, 1);
      const currentPosText = state.kind === "bytes"
        ? pack35.humanDownloadSize(state.currentPos, state.length)
        : state.currentPos.toString();
      const lengthText = state.kind === "bytes"
        ? pack35.humanDownloadSize(state.length, state.length)
        : state.length.toString();
      const maxWidth = size == null ? 75 : Math.max(10, Math.min(75, size.columns - 5));
      const sameLineTextWidth = 6 + lengthText.length * 2 + state.length.toString().length * 2;
      const totalBars = Math.max(1, maxWidth - sameLineTextWidth);
      const completedBars = Math.floor(totalBars * percent);
      let secondLine = "";
      secondLine += "[";
      if (completedBars != totalBars) {
        if (completedBars > 0) {
          secondLine += pack3.colors.cyan("#".repeat(completedBars - 1) + ">");
        }
        secondLine += pack3.colors.blue("-".repeat(totalBars - completedBars));
      } else {
        secondLine += pack3.colors.cyan("#".repeat(completedBars));
      }
      secondLine += `] (${currentPosText}/${lengthText})`;
      const result = [];
      if (firstLine.length > 0) {
        result.push(firstLine);
      }
      result.push(secondLine);
      return result;
    }
  }
  Object.defineProperty(pack32, "ProgressBar", {
    get: () => ProgressBar,
  });
  Object.defineProperty(pack32, "renderProgressBar", {
    get: () => renderProgressBar,
  });
  Object.defineProperty(pack32, "isShowingProgressBars", {
    get: () => pack25.isShowingProgressBars,
  });
})();
(function _src_console_multiSelect_ts() {
  function multiSelect(opts) {
    return maybeMultiSelect(opts).then(pack29.resultOrExit);
  }
  function maybeMultiSelect(opts) {
    if (opts.options.length === 0) {
      throw new Error(`You must provide at least one option. (Prompt: '${opts.message}')`);
    }
    return pack29.createSelection({
      message: opts.message,
      noClear: opts.noClear,
      ...innerMultiSelect(opts),
    });
  }
  function innerMultiSelect(opts) {
    const drawState = {
      title: opts.message,
      activeIndex: 0,
      items: opts.options.map((option) => {
        if (typeof option === "string") {
          option = {
            text: option,
          };
        }
        return {
          selected: option.selected ?? false,
          text: option.text,
        };
      }),
      hasCompleted: false,
    };
    return {
      render: () => render(drawState),
      onKey: (key) => {
        switch (key) {
          case pack29.Keys.Up:
            if (drawState.activeIndex === 0) {
              drawState.activeIndex = drawState.items.length - 1;
            } else {
              drawState.activeIndex--;
            }
            break;
          case pack29.Keys.Down:
            drawState.activeIndex = (drawState.activeIndex + 1) % drawState.items.length;
            break;
          case pack29.Keys.Space: {
            const item = drawState.items[drawState.activeIndex];
            item.selected = !item.selected;
            break;
          }
          case pack29.Keys.Enter:
            drawState.hasCompleted = true;
            return drawState.items.map((value, index) => [
              value,
              index,
            ]).filter(([value]) => value.selected).map(([, index]) => index);
        }
        return undefined;
      },
    };
  }
  function render(state) {
    const items = [];
    items.push(pack3.colors.bold(pack3.colors.blue(state.title)));
    if (state.hasCompleted) {
      if (state.items.some((i) => i.selected)) {
        for (const item of state.items) {
          if (item.selected) {
            items.push({
              text: ` - ${item.text}`,
              indent: 3,
            });
          }
        }
      } else {
        items.push(pack3.colors.italic(" <None>"));
      }
    } else {
      for (const [i, item] of state.items.entries()) {
        const prefix = i === state.activeIndex ? "> " : "  ";
        items.push({
          text: `${prefix}[${item.selected ? "x" : " "}] ${item.text}`,
          indent: 6,
        });
      }
    }
    return items;
  }
  Object.defineProperty(pack31, "multiSelect", {
    get: () => multiSelect,
  });
  Object.defineProperty(pack31, "maybeMultiSelect", {
    get: () => maybeMultiSelect,
  });
  Object.defineProperty(pack31, "innerMultiSelect", {
    get: () => innerMultiSelect,
  });
})();
(function _src_console_confirm_ts() {
  function confirm(optsOrMessage, options) {
    return maybeConfirm(optsOrMessage, options).then(pack29.resultOrExit);
  }
  function maybeConfirm(optsOrMessage, options) {
    const opts = typeof optsOrMessage === "string"
      ? {
        message: optsOrMessage,
        ...options,
      }
      : optsOrMessage;
    return pack29.createSelection({
      message: opts.message,
      noClear: opts.noClear,
      ...innerConfirm(opts),
    });
  }
  function innerConfirm(opts) {
    const drawState = {
      title: opts.message,
      default: opts.default,
      inputText: "",
      hasCompleted: false,
    };
    return {
      render: () => render(drawState),
      onKey: (key) => {
        switch (key) {
          case "Y":
          case "y":
            drawState.inputText = "Y";
            break;
          case "N":
          case "n":
            drawState.inputText = "N";
            break;
          case pack29.Keys.Backspace:
            drawState.inputText = "";
            break;
          case pack29.Keys.Enter:
            if (drawState.inputText.length === 0) {
              if (drawState.default == null) {
                return undefined; // do nothing
              }
              drawState.inputText = drawState.default ? "Y" : "N";
            }
            drawState.hasCompleted = true;
            return drawState.inputText === "Y" ? true : drawState.inputText === "N" ? false : drawState.default;
        }
      },
    };
  }
  function render(state) {
    return [
      pack3.colors.bold(pack3.colors.blue(state.title)) + " " +
      (state.hasCompleted ? "" : state.default == null ? "(Y/N) " : state.default ? "(Y/n) " : "(y/N) ") +
      state.inputText + (state.hasCompleted ? "" : "\u2588"),
    ];
  }
  Object.defineProperty(pack30, "confirm", {
    get: () => confirm,
  });
  Object.defineProperty(pack30, "maybeConfirm", {
    get: () => maybeConfirm,
  });
  Object.defineProperty(pack30, "innerConfirm", {
    get: () => innerConfirm,
  });
})();
(function _src_console_mod_ts() {
  Object.defineProperty(pack2, "confirm", {
    get: () => pack30.confirm,
  });
  Object.defineProperty(pack2, "maybeConfirm", {
    get: () => pack30.maybeConfirm,
  });
  Object.defineProperty(pack2, "logger", {
    get: () => pack28.logger,
  });
  Object.defineProperty(pack2, "maybeMultiSelect", {
    get: () => pack31.maybeMultiSelect,
  });
  Object.defineProperty(pack2, "multiSelect", {
    get: () => pack31.multiSelect,
  });
  Object.defineProperty(pack2, "isShowingProgressBars", {
    get: () => pack32.isShowingProgressBars,
  });
  Object.defineProperty(pack2, "ProgressBar", {
    get: () => pack32.ProgressBar,
  });
  Object.defineProperty(pack2, "maybePrompt", {
    get: () => pack33.maybePrompt,
  });
  Object.defineProperty(pack2, "prompt", {
    get: () => pack33.prompt,
  });
  Object.defineProperty(pack2, "maybeSelect", {
    get: () => pack34.maybeSelect,
  });
  Object.defineProperty(pack2, "select", {
    get: () => pack34.select,
  });
})();
(function _src_common_ts() {
  function formatMillis(ms) {
    if (ms < 1000) {
      return `${formatValue(ms)} millisecond${ms === 1 ? "" : "s"}`;
    } else if (ms < 60 * 1000) {
      const s = ms / 1000;
      return `${formatValue(s)} ${pluralize("second", s)}`;
    } else {
      const mins = ms / 60 / 1000;
      return `${formatValue(mins)} ${pluralize("minute", mins)}`;
    }
    function formatValue(value) {
      const text = value.toFixed(2);
      if (text.endsWith(".00")) {
        return value.toFixed(0);
      } else if (text.endsWith("0")) {
        return value.toFixed(1);
      } else {
        return text;
      }
    }
    function pluralize(text, value) {
      const suffix = value === 1 ? "" : "s";
      return text + suffix;
    }
  }
  function delayToIterator(delay) {
    if (typeof delay !== "number" && typeof delay !== "string") {
      return delay;
    }
    const ms = delayToMs(delay);
    return {
      next() {
        return ms;
      },
    };
  }
  function delayToMs(delay) {
    if (typeof delay === "number") {
      return delay;
    } else if (typeof delay === "string") {
      // code seems kind of repetitive
      const msMatch = delay.match(/^([0-9]+)ms$/);
      if (msMatch != null) {
        return parseInt(msMatch[1], 10);
      }
      const secondsMatch = delay.match(/^([0-9]+\.?[0-9]*)s$/);
      if (secondsMatch != null) {
        return Math.round(parseFloat(secondsMatch[1]) * 1000);
      }
      const minutesMatch = delay.match(/^([0-9]+\.?[0-9]*)m$/);
      if (minutesMatch != null) {
        return Math.round(parseFloat(minutesMatch[1]) * 1000 * 60);
      }
      const minutesSecondsMatch = delay.match(/^([0-9]+\.?[0-9]*)m([0-9]+\.?[0-9]*)s$/);
      if (minutesSecondsMatch != null) {
        return Math.round(parseFloat(minutesSecondsMatch[1]) * 1000 * 60 + parseFloat(minutesSecondsMatch[2]) * 1000);
      }
      const hoursMatch = delay.match(/^([0-9]+\.?[0-9]*)h$/);
      if (hoursMatch != null) {
        return Math.round(parseFloat(hoursMatch[1]) * 1000 * 60 * 60);
      }
      const hoursMinutesMatch = delay.match(/^([0-9]+\.?[0-9]*)h([0-9]+\.?[0-9]*)m$/);
      if (hoursMinutesMatch != null) {
        return Math.round(
          parseFloat(hoursMinutesMatch[1]) * 1000 * 60 * 60 + parseFloat(hoursMinutesMatch[2]) * 1000 * 60,
        );
      }
      const hoursMinutesSecondsMatch = delay.match(/^([0-9]+\.?[0-9]*)h([0-9]+\.?[0-9]*)m([0-9]+\.?[0-9]*)s$/);
      if (hoursMinutesSecondsMatch != null) {
        return Math.round(
          parseFloat(hoursMinutesSecondsMatch[1]) * 1000 * 60 * 60 +
            parseFloat(hoursMinutesSecondsMatch[2]) * 1000 * 60 + parseFloat(hoursMinutesSecondsMatch[3]) * 1000,
        );
      }
    }
    throw new Error(`Unknown delay value: ${delay}`);
  }
  function filterEmptyRecordValues(record) {
    const result = {};
    for (const [key, value] of Object.entries(record)) {
      if (value != null) {
        result[key] = value;
      }
    }
    return result;
  }
  function resolvePath(cwd, arg) {
    return pack3.path.resolve(pack3.path.isAbsolute(arg) ? arg : pack3.path.join(cwd, arg));
  }
  class Box {
    value;
    constructor(value) {
      this.value = value;
    }
  }
  class TreeBox {
    #value;
    constructor(value) {
      this.#value = value;
    }
    getValue() {
      let tree = this;
      while (tree.#value instanceof TreeBox) {
        tree = tree.#value;
      }
      return tree.#value;
    }
    setValue(value) {
      this.#value = value;
    }
    createChild() {
      return new TreeBox(this);
    }
  }
  class LoggerTreeBox extends TreeBox {
    getValue() {
      const innerValue = super.getValue();
      return (...args) => {
        return pack2.logger.logAboveStaticText(() => {
          innerValue(...args);
        });
      };
    }
  }
  async function safeLstat(path) {
    try {
      return await Deno.lstat(path);
    } catch (err) {
      if (err instanceof Deno.errors.NotFound) {
        return undefined;
      } else {
        throw err;
      }
    }
  }
  function getFileNameFromUrl(url) {
    const parsedUrl = url instanceof URL ? url : new URL(url);
    const fileName = parsedUrl.pathname.split("/").at(-1);
    return fileName?.length === 0 ? undefined : fileName;
  }
  async function getExecutableShebangFromPath(path) {
    try {
      const file = await Deno.open(path, {
        read: true,
      });
      try {
        return await getExecutableShebang(file);
      } finally {
        try {
          file.close();
        } catch {
          // ignore
        }
      }
    } catch (err) {
      if (err instanceof Deno.errors.NotFound) {
        return false;
      }
      throw err;
    }
  }
  const decoder = new TextDecoder();
  async function getExecutableShebang(reader) {
    const text = "#!/usr/bin/env ";
    const buffer = new Uint8Array(text.length);
    const bytesReadCount = await reader.read(buffer);
    if (bytesReadCount !== text.length || decoder.decode(buffer) !== text) {
      return undefined;
    }
    const bufReader = new pack3.BufReader(reader);
    const line = await bufReader.readLine();
    if (line == null) {
      return undefined;
    }
    const result = decoder.decode(line.line).trim();
    const dashS = "-S ";
    if (result.startsWith(dashS)) {
      return {
        stringSplit: true,
        command: result.slice(dashS.length),
      };
    } else {
      return {
        stringSplit: false,
        command: result,
      };
    }
  }
  Object.defineProperty(pack1, "formatMillis", {
    get: () => formatMillis,
  });
  Object.defineProperty(pack1, "delayToIterator", {
    get: () => delayToIterator,
  });
  Object.defineProperty(pack1, "delayToMs", {
    get: () => delayToMs,
  });
  Object.defineProperty(pack1, "filterEmptyRecordValues", {
    get: () => filterEmptyRecordValues,
  });
  Object.defineProperty(pack1, "resolvePath", {
    get: () => resolvePath,
  });
  Object.defineProperty(pack1, "Box", {
    get: () => Box,
  });
  Object.defineProperty(pack1, "TreeBox", {
    get: () => TreeBox,
  });
  Object.defineProperty(pack1, "LoggerTreeBox", {
    get: () => LoggerTreeBox,
  });
  Object.defineProperty(pack1, "safeLstat", {
    get: () => safeLstat,
  });
  Object.defineProperty(pack1, "getFileNameFromUrl", {
    get: () => getFileNameFromUrl,
  });
  Object.defineProperty(pack1, "getExecutableShebangFromPath", {
    get: () => getExecutableShebangFromPath,
  });
  Object.defineProperty(pack1, "getExecutableShebang", {
    get: () => getExecutableShebang,
  });
})();
(function _src_console_progress_interval_ts() {
  const intervalMs = 60;
  const progressBars = [];
  let renderIntervalId;
  function addProgressBar(render) {
    const pb = {
      render,
    };
    progressBars.push(pb);
    if (renderIntervalId == null && pack29.isOutputTty) {
      renderIntervalId = setInterval(forceRender, intervalMs);
    }
    return pb;
  }
  function removeProgressBar(pb) {
    const index = progressBars.indexOf(pb);
    if (index === -1) {
      return false;
    }
    progressBars.splice(index, 1);
    if (progressBars.length === 0) {
      clearInterval(renderIntervalId);
      pack28.logger.setItems(pack28.LoggerRefreshItemKind.ProgressBars, []);
      renderIntervalId = undefined;
    }
    return true;
  }
  function forceRender() {
    if (!isShowingProgressBars()) {
      return;
    }
    const size = Deno.consoleSize();
    const items = progressBars.map((p) => p.render(size)).flat();
    pack28.logger.setItems(pack28.LoggerRefreshItemKind.ProgressBars, items, size);
  }
  function isShowingProgressBars() {
    return pack29.isOutputTty && progressBars.length > 0;
  }
  Object.defineProperty(pack25, "addProgressBar", {
    get: () => addProgressBar,
  });
  Object.defineProperty(pack25, "removeProgressBar", {
    get: () => removeProgressBar,
  });
  Object.defineProperty(pack25, "forceRender", {
    get: () => forceRender,
  });
  Object.defineProperty(pack25, "isShowingProgressBars", {
    get: () => isShowingProgressBars,
  });
})();
(function _src_shell_ts() {
  class RealEnv {
    setCwd(cwd) {
      Deno.chdir(cwd);
    }
    getCwd() {
      return Deno.cwd();
    }
    setEnvVar(key, value) {
      if (value == null) {
        Deno.env.delete(key);
      } else {
        Deno.env.set(key, value);
      }
    }
    getEnvVar(key) {
      return Deno.env.get(key);
    }
    getEnvVars() {
      return Deno.env.toObject();
    }
    clone() {
      return cloneEnv(this);
    }
  }
  class ShellEnv {
    #cwd;
    #envVars = {};
    setCwd(cwd) {
      this.#cwd = cwd;
    }
    getCwd() {
      if (this.#cwd == null) {
        throw new Error("The cwd must be initialized.");
      }
      return this.#cwd;
    }
    setEnvVar(key, value) {
      if (Deno.build.os === "windows") {
        key = key.toUpperCase();
      }
      if (value == null) {
        delete this.#envVars[key];
      } else {
        this.#envVars[key] = value;
      }
    }
    getEnvVar(key) {
      if (Deno.build.os === "windows") {
        key = key.toUpperCase();
      }
      return this.#envVars[key];
    }
    getEnvVars() {
      return {
        ...this.#envVars,
      };
    }
    clone() {
      return cloneEnv(this);
    }
  }
  function initializeEnv(env, opts) {
    env.setCwd(opts.cwd);
    for (const [key, value] of Object.entries(opts.env)) {
      env.setEnvVar(key, value);
    }
  }
  function cloneEnv(env) {
    const result = new ShellEnv();
    initializeEnv(result, {
      cwd: env.getCwd(),
      env: env.getEnvVars(),
    });
    return result;
  }
  class Context {
    stdin;
    stdout;
    stderr;
    #env;
    #shellVars;
    #commands;
    #signal;
    constructor(opts) {
      this.stdin = opts.stdin;
      this.stdout = opts.stdout;
      this.stderr = opts.stderr;
      this.#env = opts.env;
      this.#commands = opts.commands;
      this.#shellVars = opts.shellVars;
      this.#signal = opts.signal;
    }
    get signal() {
      return this.#signal;
    }
    applyChanges(changes) {
      if (changes == null) {
        return;
      }
      for (const change of changes) {
        switch (change.kind) {
          case "cd":
            this.#env.setCwd(change.dir);
            break;
          case "envvar":
            this.setEnvVar(change.name, change.value);
            break;
          case "shellvar":
            this.setShellVar(change.name, change.value);
            break;
          case "unsetvar":
            this.setShellVar(change.name, undefined);
            this.setEnvVar(change.name, undefined);
            break;
          default: {
            const _assertNever = change;
            throw new Error(`Not implemented env change: ${change}`);
          }
        }
      }
    }
    setEnvVar(key, value) {
      if (Deno.build.os === "windows") {
        key = key.toUpperCase();
      }
      if (key === "PWD") {
        if (value != null && pack3.path.isAbsolute(value)) {
          this.#env.setCwd(pack3.path.resolve(value));
        }
      } else {
        delete this.#shellVars[key];
        this.#env.setEnvVar(key, value);
      }
    }
    setShellVar(key, value) {
      if (Deno.build.os === "windows") {
        key = key.toUpperCase();
      }
      if (this.#env.getEnvVar(key) != null || key === "PWD") {
        this.setEnvVar(key, value);
      } else if (value == null) {
        delete this.#shellVars[key];
      } else {
        this.#shellVars[key] = value;
      }
    }
    getEnvVars() {
      return this.#env.getEnvVars();
    }
    getCwd() {
      return this.#env.getCwd();
    }
    getVar(key) {
      if (Deno.build.os === "windows") {
        key = key.toUpperCase();
      }
      if (key === "PWD") {
        return this.#env.getCwd();
      }
      return this.#env.getEnvVar(key) ?? this.#shellVars[key];
    }
    getCommand(command) {
      return this.#commands[command] ?? null;
    }
    asCommandContext(args) {
      const context = this;
      return {
        get args() {
          return args;
        },
        get cwd() {
          return context.getCwd();
        },
        get env() {
          return context.getEnvVars();
        },
        get stdin() {
          return context.stdin;
        },
        get stdout() {
          return context.stdout;
        },
        get stderr() {
          return context.stderr;
        },
        get signal() {
          return context.signal;
        },
      };
    }
    clone() {
      return new Context({
        stdin: this.stdin,
        stdout: this.stdout,
        stderr: this.stderr,
        env: this.#env.clone(),
        commands: {
          ...this.#commands,
        },
        shellVars: {
          ...this.#shellVars,
        },
        signal: this.#signal,
      });
    }
  }
  function parseCommand(command) {
    return pack4.wasmInstance.parse(command);
  }
  async function spawn(list, opts) {
    const env = opts.exportEnv ? new RealEnv() : new ShellEnv();
    initializeEnv(env, opts);
    const context = new Context({
      env,
      commands: opts.commands,
      stdin: opts.stdin,
      stdout: opts.stdout,
      stderr: opts.stderr,
      shellVars: {},
      signal: opts.signal,
    });
    const result = await executeSequentialList(list, context);
    return result.code;
  }
  async function executeSequentialList(list, context) {
    let finalExitCode = 0;
    const finalChanges = [];
    for (const item of list.items) {
      if (item.isAsync) {
        throw new Error("Async commands are not supported. Run a command concurrently in the JS code instead.");
      }
      const result = await executeSequence(item.sequence, context);
      switch (result.kind) {
        case "continue":
          if (result.changes) {
            context.applyChanges(result.changes);
            finalChanges.push(...result.changes);
          }
          finalExitCode = result.code;
          break;
        case "exit":
          return result;
        default: {
          const _assertNever = result;
        }
      }
    }
    return {
      kind: "continue",
      code: finalExitCode,
      changes: finalChanges,
    };
  }
  function executeSequence(sequence, context) {
    if (context.signal.aborted) {
      return Promise.resolve(pack26.getAbortedResult());
    }
    switch (sequence.kind) {
      case "pipeline":
        return executePipeline(sequence, context);
      case "booleanList":
        return executeBooleanList(sequence, context);
      case "shellVar":
        return executeShellVar(sequence, context);
      default: {
        const _assertNever = sequence;
        throw new Error(`Not implemented: ${sequence}`);
      }
    }
  }
  function executePipeline(pipeline, context) {
    if (pipeline.negated) {
      throw new Error("Negated pipelines are not implemented.");
    }
    return executePipelineInner(pipeline.inner, context);
  }
  async function executeBooleanList(list, context) {
    const changes = [];
    // handle first result
    const firstResult = await executeSequence(list.current, context.clone());
    let exitCode = 0;
    switch (firstResult.kind) {
      case "exit":
        return firstResult;
      case "continue":
        if (firstResult.changes) {
          context.applyChanges(firstResult.changes);
          changes.push(...firstResult.changes);
        }
        exitCode = firstResult.code;
        break;
      default: {
        const _assertNever = firstResult;
        throw new Error("Not handled.");
      }
    }
    const next = findNextSequence(list, exitCode);
    if (next == null) {
      return {
        kind: "continue",
        code: exitCode,
        changes,
      };
    } else {
      const nextResult = await executeSequence(next, context.clone());
      switch (nextResult.kind) {
        case "exit":
          return nextResult;
        case "continue":
          if (nextResult.changes) {
            changes.push(...nextResult.changes);
          }
          return {
            kind: "continue",
            code: nextResult.code,
            changes,
          };
        default: {
          const _assertNever = nextResult;
          throw new Error("Not Implemented");
        }
      }
    }
    function findNextSequence(current, exitCode) {
      if (opMovesNextForExitCode(current.op, exitCode)) {
        return current.next;
      } else {
        let next = current.next;
        while (next.kind === "booleanList") {
          if (opMovesNextForExitCode(next.op, exitCode)) {
            return next.next;
          } else {
            next = next.next;
          }
        }
        return undefined;
      }
    }
    function opMovesNextForExitCode(op, exitCode) {
      switch (op) {
        case "or":
          return exitCode !== 0;
        case "and":
          return exitCode === 0;
      }
    }
  }
  async function executeShellVar(sequence, context) {
    const value = await evaluateWord(sequence.value, context);
    return {
      kind: "continue",
      code: 0,
      changes: [
        {
          kind: "shellvar",
          name: sequence.name,
          value,
        },
      ],
    };
  }
  function executePipelineInner(inner, context) {
    switch (inner.kind) {
      case "command":
        return executeCommand(inner, context);
      case "pipeSequence":
        throw new Error(`Not implemented: ${inner.kind}`);
    }
  }
  function executeCommand(command, context) {
    if (command.redirect != null) {
      throw new Error("Redirects are not supported. Pipe in the JS code instead using the methods on commands.");
    }
    return executeCommandInner(command.inner, context);
  }
  function executeCommandInner(command, context) {
    switch (command.kind) {
      case "simple":
        return executeSimpleCommand(command, context);
      case "sequentialList":
      default:
        throw new Error(`Not implemented: ${command.kind}`);
    }
  }
  async function executeSimpleCommand(command, parentContext) {
    const context = parentContext.clone();
    for (const envVar of command.envVars) {
      context.setEnvVar(envVar.name, await evaluateWord(envVar.value, context));
    }
    const commandArgs = await evaluateArgs(command.args, context);
    return await executeCommandArgs(commandArgs, context);
  }
  async function executeCommandArgs(commandArgs, context) {
    // look for a registered command first
    const command = context.getCommand(commandArgs[0]);
    if (command != null) {
      return command(context.asCommandContext(commandArgs.slice(1)));
    }
    // fall back to trying to resolve the command on the fs
    const resolvedCommand = await resolveCommand(commandArgs[0], context);
    if (resolvedCommand.kind === "shebang") {
      return executeCommandArgs([
        ...resolvedCommand.args,
        resolvedCommand.path,
        ...commandArgs.slice(1),
      ], context);
    }
    const _assertIsPath = resolvedCommand.kind;
    const pipeStringVals = {
      stdin: getStdioStringValue(context.stdin),
      stdout: getStdioStringValue(context.stdout.kind),
      stderr: getStdioStringValue(context.stderr.kind),
    };
    const p = new Deno.Command(resolvedCommand.path, {
      args: commandArgs.slice(1),
      cwd: context.getCwd(),
      env: context.getEnvVars(),
      ...pipeStringVals,
    }).spawn();
    const abortListener = () => p.kill("SIGKILL");
    context.signal.addEventListener("abort", abortListener);
    const completeController = new AbortController();
    const completeSignal = completeController.signal;
    let stdinError;
    const stdinPromise = writeStdin(context.stdin, p, completeSignal).catch((err) => {
      // don't surface anything because it's already been aborted
      if (completeSignal.aborted) {
        return;
      }
      context.stderr.writeLine(`stdin pipe broken. ${err}`);
      stdinError = err;
      // kill the sub process
      try {
        p.kill("SIGKILL");
      } catch (err) {
        if (!(err instanceof Deno.errors.PermissionDenied || err instanceof Deno.errors.NotFound)) {
          throw err;
        }
      }
    });
    try {
      const readStdoutTask = pipeStringVals.stdout === "piped"
        ? readStdOutOrErr(p.stdout, context.stdout)
        : Promise.resolve();
      const readStderrTask = pipeStringVals.stderr === "piped"
        ? readStdOutOrErr(p.stderr, context.stderr)
        : Promise.resolve();
      const [status] = await Promise.all([
        p.status,
        readStdoutTask,
        readStderrTask,
      ]);
      if (stdinError != null) {
        return {
          code: 1,
          kind: "exit",
        };
      } else if (context.signal.aborted) {
        return pack26.getAbortedResult();
      } else {
        return pack26.resultFromCode(status.code);
      }
    } finally {
      completeController.abort();
      context.signal.removeEventListener("abort", abortListener);
      // ensure this is done before exiting... it will never throw
      await stdinPromise;
    }
    async function writeStdin(stdin, p, signal) {
      if (typeof stdin === "string") {
        return;
      }
      await pipeReaderToWriter(stdin, p.stdin, signal);
      try {
        await p.stdin.close();
      } catch {
        // ignore
      }
    }
    async function readStdOutOrErr(readable, writer) {
      if (typeof writer === "string") {
        return;
      }
      // don't abort... ensure all of stdout/stderr is read in case the process
      // exits before this finishes
      await pipeReaderToWriterSync(readable, writer, new AbortController().signal);
    }
    async function pipeReaderToWriter(reader, writable, signal) {
      const abortedPromise = new Promise((resolve) => {
        signal.addEventListener("abort", listener);
        function listener() {
          signal.removeEventListener("abort", listener);
          resolve();
        }
      });
      const writer = writable.getWriter();
      try {
        while (!signal.aborted) {
          const buffer = new Uint8Array(1024);
          const length = await Promise.race([
            abortedPromise,
            reader.read(buffer),
          ]);
          if (length === 0 || length == null) {
            break;
          }
          await writer.write(buffer.subarray(0, length));
        }
      } finally {
        await writer.close();
      }
    }
    async function pipeReaderToWriterSync(readable, writer, signal) {
      const reader = readable.getReader();
      while (!signal.aborted) {
        const result = await reader.read();
        if (result.done) {
          break;
        }
        writeAllSync(result.value);
      }
      function writeAllSync(arr) {
        let nwritten = 0;
        while (nwritten < arr.length && !signal.aborted) {
          nwritten += writer.writeSync(arr.subarray(nwritten));
        }
      }
    }
    function getStdioStringValue(value) {
      if (value === "inheritPiped") {
        return "piped";
      } else if (value === "inherit" || value === "null" || value === "piped") {
        return value;
      } else {
        return "piped";
      }
    }
  }
  async function resolveCommand(commandName, context) {
    if (commandName.includes("/") || commandName.includes("\\")) {
      if (!pack3.path.isAbsolute(commandName)) {
        commandName = pack3.path.resolve(context.getCwd(), commandName);
      }
      // only bother checking for a shebang when the path has a slash
      // in it because for global commands someone on Windows likely
      // won't have a script with a shebang in it on Windows
      const result = await pack1.getExecutableShebangFromPath(commandName);
      if (result === false) {
        throw new Error(`Command not found: ${commandName}`);
      } else if (result != null) {
        return {
          kind: "shebang",
          path: commandName,
          args: await parseShebangArgs(result, context),
        };
      } else {
        const _assertUndefined = result;
        return {
          kind: "path",
          path: commandName,
        };
      }
    }
    // always use the current executable for "deno"
    if (commandName.toUpperCase() === "DENO") {
      return {
        kind: "path",
        path: Deno.execPath(),
      };
    }
    const realEnvironment = new pack3.DenoWhichRealEnvironment();
    const commandPath = await pack3.which(commandName, {
      os: Deno.build.os,
      stat: realEnvironment.stat,
      env(key) {
        return context.getVar(key);
      },
    });
    if (commandPath == null) {
      throw new Error(`Command not found: ${commandName}`);
    }
    return {
      kind: "path",
      path: commandPath,
    };
  }
  async function parseShebangArgs(info, context) {
    function throwUnsupported() {
      throw new Error("Unsupported shebang. Please report this as a bug.");
    }
    if (!info.stringSplit) {
      return [
        info.command,
      ];
    }
    // todo: move shebang parsing into deno_task_shell and investigate actual shebang parsing behaviour
    const command = parseCommand(info.command);
    if (command.items.length !== 1) {
      throwUnsupported();
    }
    const item = command.items[0];
    if (item.sequence.kind !== "pipeline" || item.isAsync) {
      throwUnsupported();
    }
    const sequence = item.sequence;
    if (sequence.negated) {
      throwUnsupported();
    }
    if (sequence.inner.kind !== "command" || sequence.inner.redirect != null) {
      throwUnsupported();
    }
    const innerCommand = sequence.inner.inner;
    if (innerCommand.kind !== "simple") {
      throwUnsupported();
    }
    if (innerCommand.envVars.length > 0) {
      throwUnsupported();
    }
    return await evaluateArgs(innerCommand.args, context);
  }
  async function evaluateArgs(args, context) {
    const result = [];
    for (const arg of args) {
      result.push(...await evaluateWordParts(arg, context));
    }
    return result;
  }
  async function evaluateWord(word, context) {
    const result = await evaluateWordParts(word, context);
    return result.join(" ");
  }
  async function evaluateWordParts(wordParts, context) {
    // not implemented mostly, and copying from deno_task_shell
    const result = [];
    let currentText = "";
    for (const stringPart of wordParts) {
      let evaluationResult = undefined;
      switch (stringPart.kind) {
        case "text":
          currentText += stringPart.value;
          break;
        case "variable":
          evaluationResult = context.getVar(stringPart.value); // value is name
          break;
        case "quoted": {
          const text = (await evaluateWordParts(stringPart.value, context)).join(" ");
          currentText += text;
          continue;
        }
        case "command":
        default:
          throw new Error(`Not implemented: ${stringPart.kind}`);
      }
      if (evaluationResult != null) {
        const parts = evaluationResult.split(" ").map((t) => t.trim()).filter((t) => t.length > 0);
        if (parts.length > 0) {
          // append the first part to the current text
          currentText += parts[0];
          // store the current text
          result.push(currentText);
          // store all the rest of the parts
          result.push(...parts.slice(1));
          // use the last part as the current text so it maybe
          // gets appended to in the future
          currentText = result.pop();
        }
      }
    }
    if (currentText.length !== 0) {
      result.push(currentText);
    }
    return result;
  }
  Object.defineProperty(pack24, "Context", {
    get: () => Context,
  });
  Object.defineProperty(pack24, "parseCommand", {
    get: () => parseCommand,
  });
  Object.defineProperty(pack24, "spawn", {
    get: () => spawn,
  });
})();
(function _src_console_utils_ts() {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let Keys;
  (function (Keys) {
    Keys[Keys["Up"] = 0] = "Up";
    Keys[Keys["Down"] = 1] = "Down";
    Keys[Keys["Left"] = 2] = "Left";
    Keys[Keys["Right"] = 3] = "Right";
    Keys[Keys["Enter"] = 4] = "Enter";
    Keys[Keys["Space"] = 5] = "Space";
    Keys[Keys["Backspace"] = 6] = "Backspace";
  })(Keys || (Keys = {}));
  async function* readKeys() {
    const { strip_ansi_codes } = pack4.wasmInstance;
    while (true) {
      const buf = new Uint8Array(8);
      const byteCount = await Deno.read(Deno.stdin.rid, buf);
      if (byteCount == null) {
        break;
      }
      if (byteCount === 3) {
        if (buf[0] === 27 && buf[1] === 91) {
          if (buf[2] === 65) {
            yield Keys.Up;
            continue;
          } else if (buf[2] === 66) {
            yield Keys.Down;
            continue;
          } else if (buf[2] === 67) {
            yield Keys.Right;
            continue;
          } else if (buf[2] === 68) {
            yield Keys.Left;
            continue;
          }
        }
      } else if (byteCount === 1) {
        if (buf[0] === 3) {
          break;
        } else if (buf[0] === 13) {
          yield Keys.Enter;
          continue;
        } else if (buf[0] === 32) {
          yield Keys.Space;
          continue;
        } else if (buf[0] === 127) {
          yield Keys.Backspace;
          continue;
        }
      }
      const text = strip_ansi_codes(decoder.decode(buf.slice(0, byteCount ?? 0)));
      if (text.length > 0) {
        yield text;
      }
    }
  }
  function hideCursor() {
    Deno.stderr.writeSync(encoder.encode("\x1B[?25l"));
  }
  function showCursor() {
    Deno.stderr.writeSync(encoder.encode("\x1B[?25h"));
  }
  const isOutputTty = safeConsoleSize() != null && Deno.isatty(Deno.stderr.rid);
  function resultOrExit(result) {
    if (result == null) {
      Deno.exit(130);
    } else {
      return result;
    }
  }
  function createSelection(options) {
    if (!isOutputTty || !Deno.isatty(Deno.stdin.rid)) {
      throw new Error(`Cannot prompt when not a tty. (Prompt: '${options.message}')`);
    }
    if (safeConsoleSize() == null) {
      throw new Error(`Cannot prompt when can't get console size. (Prompt: '${options.message}')`);
    }
    return ensureSingleSelection(async () => {
      pack28.logger.setItems(pack28.LoggerRefreshItemKind.Selection, options.render());
      for await (const key of readKeys()) {
        const keyResult = options.onKey(key);
        if (keyResult != null) {
          const size = Deno.consoleSize();
          pack28.logger.setItems(pack28.LoggerRefreshItemKind.Selection, [], size);
          if (options.noClear) {
            pack28.logger.logOnce(options.render(), size);
          }
          return keyResult;
        }
        pack28.logger.setItems(pack28.LoggerRefreshItemKind.Selection, options.render());
      }
      pack28.logger.setItems(pack28.LoggerRefreshItemKind.Selection, []); // clear
      return undefined;
    });
  }
  let lastPromise = Promise.resolve();
  function ensureSingleSelection(action) {
    const currentLastPromise = lastPromise;
    const currentPromise = (async () => {
      try {
        await currentLastPromise;
      } catch {
        // ignore
      }
      hideCursor();
      try {
        Deno.stdin.setRaw(true);
        try {
          return await action();
        } finally {
          Deno.stdin.setRaw(false);
        }
      } finally {
        showCursor();
      }
    })();
    lastPromise = currentPromise;
    return currentPromise;
  }
  function safeConsoleSize() {
    try {
      return Deno.consoleSize();
    } catch {
      return undefined;
    }
  }
  const staticText = {
    set(items, size) {
      if (items.length === 0) {
        return this.clear(size);
      }
      const { columns, rows } = size ?? Deno.consoleSize();
      const newText = pack4.wasmInstance.static_text_render_text(items, columns, rows);
      if (newText != null) {
        Deno.stderr.writeSync(encoder.encode(newText));
      }
    },
    outputItems(items, size) {
      const { columns, rows } = size ?? Deno.consoleSize();
      const newText = pack4.wasmInstance.static_text_render_once(items, columns, rows);
      if (newText != null) {
        Deno.stderr.writeSync(encoder.encode(newText + "\n"));
      }
    },
    clear(size) {
      const { columns, rows } = size ?? Deno.consoleSize();
      const newText = pack4.wasmInstance.static_text_clear_text(columns, rows);
      if (newText != null) {
        Deno.stderr.writeSync(encoder.encode(newText));
      }
    },
  };
  Object.defineProperty(pack29, "Keys", {
    get: () => Keys,
  });
  Object.defineProperty(pack29, "readKeys", {
    get: () => readKeys,
  });
  Object.defineProperty(pack29, "hideCursor", {
    get: () => hideCursor,
  });
  Object.defineProperty(pack29, "showCursor", {
    get: () => showCursor,
  });
  Object.defineProperty(pack29, "isOutputTty", {
    get: () => isOutputTty,
  });
  Object.defineProperty(pack29, "resultOrExit", {
    get: () => resultOrExit,
  });
  Object.defineProperty(pack29, "createSelection", {
    get: () => createSelection,
  });
  Object.defineProperty(pack29, "safeConsoleSize", {
    get: () => safeConsoleSize,
  });
  Object.defineProperty(pack29, "staticText", {
    get: () => staticText,
  });
})();
(function _src_console_logger_ts() {
  let LoggerRefreshItemKind;
  (function (LoggerRefreshItemKind) {
    LoggerRefreshItemKind[LoggerRefreshItemKind["ProgressBars"] = 0] = "ProgressBars";
    LoggerRefreshItemKind[LoggerRefreshItemKind["Selection"] = 1] = "Selection";
  })(LoggerRefreshItemKind || (LoggerRefreshItemKind = {}));
  const refreshItems = {
    [LoggerRefreshItemKind.ProgressBars]: undefined,
    [LoggerRefreshItemKind.Selection]: undefined,
  };
  function setItems(kind, items, size) {
    refreshItems[kind] = items;
    refresh(size);
  }
  function refresh(size) {
    if (!pack29.isOutputTty) {
      return;
    }
    const items = Object.values(refreshItems).flatMap((items) => items ?? []);
    pack29.staticText.set(items, size);
  }
  function logAboveStaticText(inner, providedSize) {
    if (!pack29.isOutputTty) {
      inner();
      return;
    }
    const size = providedSize ?? pack29.safeConsoleSize();
    if (size != null) {
      pack29.staticText.clear(size);
    }
    inner();
    refresh(size);
  }
  function logOnce(items, size) {
    logAboveStaticText(() => {
      pack29.staticText.outputItems(items, size);
    }, size);
  }
  const logger = {
    setItems,
    logOnce,
    logAboveStaticText,
  };
  Object.defineProperty(pack28, "LoggerRefreshItemKind", {
    get: () => LoggerRefreshItemKind,
  });
  Object.defineProperty(pack28, "logger", {
    get: () => logger,
  });
})();
(function _src_pipes_ts() {
  const encoder = new TextEncoder();
  class NullPipeWriter {
    writeSync(p) {
      return p.length;
    }
  }
  class ShellPipeWriter {
    #kind;
    #inner;
    constructor(kind, inner) {
      this.#kind = kind;
      this.#inner = inner;
    }
    get kind() {
      return this.#kind;
    }
    writeSync(p) {
      return this.#inner.writeSync(p);
    }
    writeText(text) {
      return pack3.writeAllSync(this, encoder.encode(text));
    }
    writeLine(text) {
      return this.writeText(text + "\n");
    }
  }
  class CapturingBufferWriter {
    #buffer;
    #innerWriter;
    constructor(innerWriter, buffer) {
      this.#innerWriter = innerWriter;
      this.#buffer = buffer;
    }
    getBuffer() {
      return this.#buffer;
    }
    writeSync(p) {
      const nWritten = this.#innerWriter.writeSync(p);
      this.#buffer.writeSync(p.slice(0, nWritten));
      return nWritten;
    }
  }
  const lineFeedCharCode = "\n".charCodeAt(0);
  class InheritStaticTextBypassWriter {
    #buffer;
    #innerWriter;
    constructor(innerWriter) {
      this.#innerWriter = innerWriter;
      this.#buffer = new pack3.Buffer();
    }
    writeSync(p) {
      // line buffer the output so that we don't conflict with the progress bars
      const index = p.findLastIndex((v) => v === lineFeedCharCode);
      if (index === -1) {
        this.#buffer.writeSync(p);
      } else {
        // todo: seems inefficient
        this.#buffer.writeSync(p.slice(0, index + 1));
        this.flush();
        this.#buffer.writeSync(p.slice(index + 1));
      }
      return p.byteLength;
    }
    flush() {
      const bytes = this.#buffer.bytes({
        copy: false,
      });
      pack28.logger.logAboveStaticText(() => {
        pack3.writeAllSync(this.#innerWriter, bytes);
      });
      this.#buffer.reset();
    }
  }
  class PipedBuffer {
    #inner;
    #hasSet = false;
    constructor() {
      this.#inner = new pack3.Buffer();
    }
    getBuffer() {
      if (this.#inner instanceof pack3.Buffer) {
        return this.#inner;
      } else {
        return undefined;
      }
    }
    setError(err) {
      if ("setError" in this.#inner) {
        this.#inner.setError(err);
      }
    }
    close() {
      if ("close" in this.#inner) {
        this.#inner.close();
      }
    }
    writeSync(p) {
      return this.#inner.writeSync(p);
    }
    setListener(listener) {
      if (this.#hasSet) {
        throw new Error("Piping to multiple outputs is currently not supported.");
      }
      if (this.#inner instanceof pack3.Buffer) {
        pack3.writeAllSync(
          listener,
          this.#inner.bytes({
            copy: false,
          }),
        );
      }
      this.#inner = listener;
      this.#hasSet = true;
    }
  }
  Object.defineProperty(pack23, "NullPipeWriter", {
    get: () => NullPipeWriter,
  });
  Object.defineProperty(pack23, "ShellPipeWriter", {
    get: () => ShellPipeWriter,
  });
  Object.defineProperty(pack23, "CapturingBufferWriter", {
    get: () => CapturingBufferWriter,
  });
  Object.defineProperty(pack23, "InheritStaticTextBypassWriter", {
    get: () => InheritStaticTextBypassWriter,
  });
  Object.defineProperty(pack23, "PipedBuffer", {
    get: () => PipedBuffer,
  });
})();
(function _src_commands_unset_ts() {
  function unsetCommand(context) {
    try {
      return {
        kind: "continue",
        code: 0,
        changes: parseNames(context.args).map((name) => ({
          kind: "unsetvar",
          name,
        })),
      };
    } catch (err) {
      context.stderr.writeLine(`unset: ${err?.message ?? err}`);
      return pack26.resultFromCode(1);
    }
  }
  function parseNames(args) {
    if (args[0] === "-f") {
      // we don't support the -f (function) flag
      throw Error(`unsupported flag: -f`);
    } else if (args[0] === "-v") {
      return args.slice(1);
    } else {
      return args;
    }
  }
  Object.defineProperty(pack22, "unsetCommand", {
    get: () => unsetCommand,
  });
})();
(function _src_commands_touch_ts() {
  async function touchCommand(context) {
    try {
      await executetouch(context.args);
      return pack26.resultFromCode(0);
    } catch (err) {
      context.stderr.writeLine(`touch: ${err?.message ?? err}`);
      return pack26.resultFromCode(1);
    }
  }
  async function executetouch(args) {
    const flags = parseArgs(args);
    for (const path of flags.paths) {
      const f = await Deno.create(path);
      f.close();
    }
  }
  function parseArgs(args) {
    const paths = [];
    for (const arg of pack27.parseArgKinds(args)) {
      if (arg.kind === "Arg") paths.push(arg.arg);
      else pack27.bailUnsupported(arg);
    }
    if (paths.length === 0) throw Error("missing file operand");
    return {
      paths,
    };
  }
  Object.defineProperty(pack21, "touchCommand", {
    get: () => touchCommand,
  });
  Object.defineProperty(pack21, "parseArgs", {
    get: () => parseArgs,
  });
})();
(function _src_commands_test_ts() {
  async function testCommand(context) {
    try {
      const [testFlag, testPath] = parseArgs(context.cwd, context.args);
      let result;
      switch (testFlag) {
        case "-f":
          result = (await pack1.safeLstat(testPath))?.isFile ?? false;
          break;
        case "-d":
          result = (await pack1.safeLstat(testPath))?.isDirectory ?? false;
          break;
        case "-e":
          result = await pack3.fs.exists(testPath);
          break;
        case "-s":
          result = ((await pack1.safeLstat(testPath))?.size ?? 0) > 0;
          break;
        case "-L":
          result = (await pack1.safeLstat(testPath))?.isSymlink ?? false;
          break;
        default:
          throw new Error("unsupported test type");
      }
      return pack26.resultFromCode(result ? 0 : 1);
    } catch (err) {
      context.stderr.writeLine(`test: ${err?.message ?? err}`);
      // bash test returns 2 on error, e.g. -bash: test: -8: unary operator expected
      return pack26.resultFromCode(2);
    }
  }
  function parseArgs(cwd, args) {
    if (args.length !== 2) {
      throw new Error("expected 2 arguments");
    }
    if (args[0] == null || !args[0].startsWith("-")) {
      throw new Error("missing test type flag");
    }
    return [
      args[0],
      pack1.resolvePath(cwd, args[1]),
    ];
  }
  Object.defineProperty(pack20, "testCommand", {
    get: () => testCommand,
  });
})();
(function _src_commands_sleep_ts() {
  async function sleepCommand(context) {
    try {
      const ms = parseArgs(context.args);
      await new Promise((resolve) => {
        const timeoutId = setTimeout(listener, ms);
        context.signal.addEventListener("abort", listener);
        function listener() {
          resolve();
          clearInterval(timeoutId);
          context.signal.removeEventListener("abort", listener);
        }
      });
      if (context.signal.aborted) {
        return pack26.getAbortedResult();
      }
      return pack26.resultFromCode(0);
    } catch (err) {
      context.stderr.writeLine(`sleep: ${err?.message ?? err}`);
      return pack26.resultFromCode(1);
    }
  }
  function parseArgs(args) {
    // time to sleep is the sum of all the arguments
    let totalTimeMs = 0;
    if (args.length === 0) {
      throw new Error("missing operand");
    }
    for (const arg of args) {
      if (arg.startsWith("-")) {
        throw new Error(`unsupported: ${arg}`);
      }
      const value = parseFloat(arg);
      if (isNaN(value)) {
        throw new Error(`error parsing argument '${arg}' to number.`);
      }
      totalTimeMs = value * 1000;
    }
    return totalTimeMs;
  }
  Object.defineProperty(pack19, "sleepCommand", {
    get: () => sleepCommand,
  });
})();
(function _src_commands_pwd_ts() {
  function pwdCommand(context) {
    try {
      const output = executePwd(context.cwd, context.args);
      context.stdout.writeLine(output);
      return pack26.resultFromCode(0);
    } catch (err) {
      context.stderr.writeLine(`pwd: ${err?.message ?? err}`);
      return pack26.resultFromCode(1);
    }
  }
  function executePwd(cwd, args) {
    const flags = parseArgs(args);
    if (flags.logical) {
      return pack3.path.resolve(cwd);
    } else {
      return cwd;
    }
  }
  function parseArgs(args) {
    let logical = false;
    for (const arg of pack27.parseArgKinds(args)) {
      if (arg.arg === "L" && arg.kind === "ShortFlag") {
        logical = true;
      } else if (arg.arg === "P" && arg.kind == "ShortFlag") {
        // ignore, this is the default
      } else if (arg.kind === "Arg") {
        // args are ignored by pwd
      } else {
        pack27.bailUnsupported(arg);
      }
    }
    return {
      logical,
    };
  }
  Object.defineProperty(pack18, "pwdCommand", {
    get: () => pwdCommand,
  });
  Object.defineProperty(pack18, "parseArgs", {
    get: () => parseArgs,
  });
})();
(function _src_commands_rm_ts() {
  async function rmCommand(context) {
    try {
      await executeRemove(context.cwd, context.args);
      return pack26.resultFromCode(0);
    } catch (err) {
      context.stderr.writeLine(`rm: ${err?.message ?? err}`);
      return pack26.resultFromCode(1);
    }
  }
  async function executeRemove(cwd, args) {
    const flags = parseArgs(args);
    await Promise.all(flags.paths.map((specifiedPath) => {
      if (specifiedPath.length === 0) {
        throw new Error("Bug in dax. Specified path should have not been empty.");
      }
      const path = pack1.resolvePath(cwd, specifiedPath);
      if (path === "/") {
        // just in case...
        throw new Error("Cannot delete root directory. Maybe bug in dax? Please report this.");
      }
      return Deno.remove(path, {
        recursive: flags.recursive,
      }).catch((err) => {
        if (flags.force && err instanceof Deno.errors.NotFound) {
          return Promise.resolve();
        } else {
          return Promise.reject(err);
        }
      });
    }));
  }
  function parseArgs(args) {
    const result = {
      recursive: false,
      force: false,
      dir: false,
      paths: [],
    };
    for (const arg of pack27.parseArgKinds(args)) {
      if (
        arg.arg === "recursive" && arg.kind === "LongFlag" || arg.arg === "r" && arg.kind == "ShortFlag" ||
        arg.arg === "R" && arg.kind === "ShortFlag"
      ) {
        result.recursive = true;
      } else if (arg.arg == "dir" && arg.kind === "LongFlag" || arg.arg == "d" && arg.kind === "ShortFlag") {
        result.dir = true;
      } else if (arg.arg == "force" && arg.kind === "LongFlag" || arg.arg == "f" && arg.kind === "ShortFlag") {
        result.force = true;
      } else {
        if (arg.kind !== "Arg") bailUnsupported(arg);
        result.paths.push(arg.arg.trim());
      }
    }
    if (result.paths.length === 0) {
      throw Error("missing operand");
    }
    return result;
  }
  function bailUnsupported(arg) {
    switch (arg.kind) {
      case "Arg":
        throw Error(`unsupported argument: ${arg.arg}`);
      case "ShortFlag":
        throw Error(`unsupported flag: -${arg.arg}`);
      case "LongFlag":
        throw Error(`unsupported flag: --${arg.arg}`);
    }
  }
  Object.defineProperty(pack17, "rmCommand", {
    get: () => rmCommand,
  });
  Object.defineProperty(pack17, "parseArgs", {
    get: () => parseArgs,
  });
})();
(function _src_commands_mkdir_ts() {
  async function mkdirCommand(context) {
    try {
      await executeMkdir(context.cwd, context.args);
      return pack26.resultFromCode(0);
    } catch (err) {
      context.stderr.writeLine(`mkdir: ${err?.message ?? err}`);
      return pack26.resultFromCode(1);
    }
  }
  async function executeMkdir(cwd, args) {
    const flags = parseArgs(args);
    for (const specifiedPath of flags.paths) {
      const path = pack1.resolvePath(cwd, specifiedPath);
      const info = await pack1.safeLstat(path);
      if (info?.isFile || !flags.parents && info?.isDirectory) {
        throw Error(`cannot create directory '${specifiedPath}': File exists`);
      }
      if (flags.parents) {
        await Deno.mkdir(path, {
          recursive: true,
        });
      } else {
        await Deno.mkdir(path);
      }
    }
  }
  function parseArgs(args) {
    const result = {
      parents: false,
      paths: [],
    };
    for (const arg of pack27.parseArgKinds(args)) {
      if (arg.arg === "parents" && arg.kind === "LongFlag" || arg.arg === "p" && arg.kind == "ShortFlag") {
        result.parents = true;
      } else {
        if (arg.kind !== "Arg") pack27.bailUnsupported(arg);
        result.paths.push(arg.arg.trim()); // NOTE: rust version doesn't trim
      }
    }
    if (result.paths.length === 0) {
      throw Error("missing operand");
    }
    return result;
  }
  Object.defineProperty(pack16, "mkdirCommand", {
    get: () => mkdirCommand,
  });
  Object.defineProperty(pack16, "parseArgs", {
    get: () => parseArgs,
  });
})();
(function _src_commands_export_ts() {
  function exportCommand(context) {
    const changes = [];
    for (const arg of context.args) {
      const equalsIndex = arg.indexOf("=");
      // ignore if it doesn't contain an equals sign
      if (equalsIndex >= 0) {
        changes.push({
          kind: "envvar",
          name: arg.substring(0, equalsIndex),
          value: arg.substring(equalsIndex + 1),
        });
      }
    }
    return {
      kind: "continue",
      code: 0,
      changes,
    };
  }
  Object.defineProperty(pack15, "exportCommand", {
    get: () => exportCommand,
  });
})();
(function _src_commands_exit_ts() {
  function exitCommand(context) {
    try {
      const code = parseArgs(context.args);
      return {
        kind: "exit",
        code,
      };
    } catch (err) {
      context.stderr.writeLine(`exit: ${err?.message ?? err}`);
      // impl. note: bash returns 2 on exit parse failure, deno_task_shell returns 1
      return {
        kind: "exit",
        code: 2,
      };
    }
  }
  function parseArgs(args) {
    // no explicit code defaults to 1
    if (args.length === 0) return 1;
    if (args.length > 1) throw new Error("too many arguments");
    const exitCode = parseInt(args[0], 10);
    if (isNaN(exitCode)) throw new Error("numeric argument required.");
    if (exitCode < 0) {
      const code = -exitCode % 256;
      return 256 - code;
    }
    return exitCode % 256;
  }
  Object.defineProperty(pack14, "exitCommand", {
    get: () => exitCommand,
  });
})();
(function _src_commands_cat_ts() {
  async function catCommand(context) {
    try {
      const exit_code = await executeCat(context);
      return pack26.resultFromCode(exit_code);
    } catch (err) {
      context.stderr.writeLine(`cat: ${err?.message ?? err}`);
      return pack26.resultFromCode(1);
    }
  }
  async function executeCat(context) {
    const flags = parseCatArgs(context.args);
    let exit_code = 0;
    const buf = new Uint8Array(1024);
    for (const path of flags.paths) {
      if (path === "-") {
        if (typeof context.stdin === "object") {
          while (true) {
            const size = await context.stdin.read(buf);
            if (!size || size === 0) break;
            else context.stdout.writeSync(buf.slice(0, size));
          }
        } else {
          const _assertValue = context.stdin;
          throw new Error(`not supported. stdin was '${context.stdin}'`);
        }
      } else {
        let file;
        try {
          file = Deno.openSync(pack3.path.join(context.cwd, path), {
            read: true,
          });
          while (true) {
            // NOTE: rust supports cancellation here
            const size = file.readSync(buf);
            if (!size || size === 0) break;
            else context.stdout.writeSync(buf.slice(0, size));
          }
        } catch (err) {
          context.stderr.writeLine(`cat ${path}: ${err}`);
          exit_code = 1;
        } finally {
          if (file) file.close();
        }
      }
    }
    return exit_code;
  }
  function parseCatArgs(args) {
    const paths = [];
    for (const arg of pack27.parseArgKinds(args)) {
      if (arg.kind === "Arg") paths.push(arg.arg);
      else pack27.bailUnsupported(arg); // for now, we don't support any arguments
    }
    if (paths.length === 0) paths.push("-");
    return {
      paths,
    };
  }
  Object.defineProperty(pack13, "catCommand", {
    get: () => catCommand,
  });
  Object.defineProperty(pack13, "parseCatArgs", {
    get: () => parseCatArgs,
  });
})();
(function _src_commands_echo_ts() {
  function echoCommand(context) {
    context.stdout.writeLine(context.args.join(" "));
    return pack26.resultFromCode(0);
  }
  Object.defineProperty(pack12, "echoCommand", {
    get: () => echoCommand,
  });
})();
(function _src_commands_args_ts() {
  function parseArgKinds(flags) {
    const result = [];
    let had_dash_dash = false;
    for (const arg of flags) {
      if (had_dash_dash) {
        result.push({
          arg,
          kind: "Arg",
        });
      } else if (arg == "-") {
        result.push({
          arg: "-",
          kind: "Arg",
        });
      } else if (arg == "--") {
        had_dash_dash = true;
      } else if (arg.startsWith("--")) {
        result.push({
          arg: arg.replace(/^--/, ""),
          kind: "LongFlag",
        });
      } else if (arg.startsWith("-")) {
        const flags = arg.replace(/^-/, "");
        if (!isNaN(parseFloat(flags))) {
          result.push({
            arg,
            kind: "Arg",
          });
        } else {
          for (const c of flags) {
            result.push({
              arg: c,
              kind: "ShortFlag",
            });
          }
        }
      } else {
        result.push({
          arg,
          kind: "Arg",
        });
      }
    }
    return result;
  }
  function bailUnsupported(arg) {
    switch (arg.kind) {
      case "Arg":
        throw Error(`unsupported argument: ${arg.arg}`);
      case "ShortFlag":
        throw Error(`unsupported flag: -${arg.arg}`);
      case "LongFlag":
        throw Error(`unsupported flag: --${arg.arg}`);
    }
  }
  Object.defineProperty(pack27, "parseArgKinds", {
    get: () => parseArgKinds,
  });
  Object.defineProperty(pack27, "bailUnsupported", {
    get: () => bailUnsupported,
  });
})();
(function _src_commands_cp_mv_ts() {
  async function cpCommand(context) {
    try {
      await executeCp(context.cwd, context.args);
      return pack26.resultFromCode(0);
    } catch (err) {
      context.stderr.writeLine(`cp: ${err?.message ?? err}`);
      return pack26.resultFromCode(1);
    }
  }
  async function executeCp(cwd, args) {
    const flags = await parseCpArgs(cwd, args);
    for (const { from, to } of flags.operations) {
      await doCopyOperation(flags, from, to);
    }
  }
  async function parseCpArgs(cwd, args) {
    const paths = [];
    let recursive = false;
    for (const arg of pack27.parseArgKinds(args)) {
      if (arg.kind === "Arg") paths.push(arg.arg);
      else if (
        arg.arg === "recursive" && arg.kind === "LongFlag" || arg.arg === "r" && arg.kind == "ShortFlag" ||
        arg.arg === "R" && arg.kind === "ShortFlag"
      ) {
        recursive = true;
      } else pack27.bailUnsupported(arg);
    }
    if (paths.length === 0) throw Error("missing file operand");
    else if (paths.length === 1) throw Error(`missing destination file operand after '${paths[0]}'`);
    return {
      recursive,
      operations: await getCopyAndMoveOperations(cwd, paths),
    };
  }
  async function doCopyOperation(flags, from, to) {
    // These are racy with the file system, but that's ok.
    // They only exists to give better error messages.
    const fromInfo = await pack1.safeLstat(from.path);
    if (fromInfo?.isDirectory) {
      if (flags.recursive) {
        const toInfo = await pack1.safeLstat(to.path);
        if (toInfo?.isFile) {
          throw Error("destination was a file");
        } else if (toInfo?.isSymlink) {
          throw Error("no support for copying to symlinks");
        } else if (fromInfo.isSymlink) {
          throw Error("no support for copying from symlinks");
        } else {
          await copyDirRecursively(from.path, to.path);
        }
      } else {
        throw Error("source was a directory; maybe specify -r");
      }
    } else {
      await Deno.copyFile(from.path, to.path);
    }
  }
  async function copyDirRecursively(from, to) {
    await Deno.mkdir(to, {
      recursive: true,
    });
    const readDir = Deno.readDir(from);
    for await (const entry of readDir) {
      const newFrom = pack3.path.join(from, pack3.path.basename(entry.name));
      const newTo = pack3.path.join(to, pack3.path.basename(entry.name));
      if (entry.isDirectory) {
        await copyDirRecursively(newFrom, newTo);
      } else if (entry.isFile) {
        await Deno.copyFile(newFrom, newTo);
      }
    }
  }
  async function mvCommand(context) {
    try {
      await executeMove(context.cwd, context.args);
      return pack26.resultFromCode(0);
    } catch (err) {
      context.stderr.writeLine(`mv: ${err?.message ?? err}`);
      return pack26.resultFromCode(1);
    }
  }
  async function executeMove(cwd, args) {
    const flags = await parseMvArgs(cwd, args);
    for (const { from, to } of flags.operations) {
      await Deno.rename(from.path, to.path);
    }
  }
  async function parseMvArgs(cwd, args) {
    const paths = [];
    for (const arg of pack27.parseArgKinds(args)) {
      if (arg.kind === "Arg") paths.push(arg.arg);
      else pack27.bailUnsupported(arg);
    }
    if (paths.length === 0) throw Error("missing operand");
    else if (paths.length === 1) throw Error(`missing destination file operand after '${paths[0]}'`);
    return {
      operations: await getCopyAndMoveOperations(cwd, paths),
    };
  }
  async function getCopyAndMoveOperations(cwd, paths) {
    // copy and move share the same logic
    const specified_destination = paths.splice(paths.length - 1, 1)[0];
    const destination = pack1.resolvePath(cwd, specified_destination);
    const fromArgs = paths;
    const operations = [];
    if (fromArgs.length > 1) {
      if (!await pack1.safeLstat(destination).then((p) => p?.isDirectory)) {
        throw Error(`target '${specified_destination}' is not a directory`);
      }
      for (const from of fromArgs) {
        const fromPath = pack1.resolvePath(cwd, from);
        const toPath = pack3.path.join(destination, pack3.path.basename(fromPath));
        operations.push({
          from: {
            specified: from,
            path: fromPath,
          },
          to: {
            specified: specified_destination,
            path: toPath,
          },
        });
      }
    } else {
      const fromPath = pack1.resolvePath(cwd, fromArgs[0]);
      const toPath = await pack1.safeLstat(destination).then((p) => p?.isDirectory)
        ? calculateDestinationPath(destination, fromPath)
        : destination;
      operations.push({
        from: {
          specified: fromArgs[0],
          path: fromPath,
        },
        to: {
          specified: specified_destination,
          path: toPath,
        },
      });
    }
    return operations;
  }
  function calculateDestinationPath(destination, from) {
    return pack3.path.join(destination, pack3.path.basename(from));
  }
  Object.defineProperty(pack11, "cpCommand", {
    get: () => cpCommand,
  });
  Object.defineProperty(pack11, "parseCpArgs", {
    get: () => parseCpArgs,
  });
  Object.defineProperty(pack11, "mvCommand", {
    get: () => mvCommand,
  });
  Object.defineProperty(pack11, "parseMvArgs", {
    get: () => parseMvArgs,
  });
})();
(function _src_commands_printenv_ts() {
  function printEnvCommand(context) {
    // windows expects env vars to be upcased
    let args;
    if (Deno.build.os === "windows") {
      args = context.args.map((arg) => arg.toUpperCase());
    } else {
      args = context.args;
    }
    try {
      const result = executePrintEnv(context.env, args);
      context.stdout.writeLine(result);
      if (args.some((arg) => context.env[arg] === undefined)) {
        return pack26.resultFromCode(1);
      }
      return pack26.resultFromCode(0);
    } catch (err) {
      context.stderr.writeLine(`printenv: ${err?.message ?? err}`);
      return pack26.resultFromCode(1);
    }
  }
  function executePrintEnv(env, args) {
    const isWindows = Deno.build.os === "windows";
    if (args.length === 0) {
      return Object.entries(env) // on windows, env vars are case insensitive
        .map(([key, val]) => `${isWindows ? key.toUpperCase() : key}=${val}`).join("\n");
    } else {
      if (isWindows) {
        args = args.map((arg) => arg.toUpperCase());
      }
      return Object.entries(env).filter(([key]) => args.includes(key)).map(([_key, val]) => val).join("\n");
    }
  }
  Object.defineProperty(pack10, "printEnvCommand", {
    get: () => printEnvCommand,
  });
})();
(function _src_commands_cd_ts() {
  async function cdCommand(context) {
    try {
      const dir = await executeCd(context.cwd, context.args);
      return {
        code: 0,
        kind: "continue",
        changes: [
          {
            kind: "cd",
            dir,
          },
        ],
      };
    } catch (err) {
      context.stderr.writeLine(`cd: ${err?.message ?? err}`);
      return pack26.resultFromCode(1);
    }
  }
  async function executeCd(cwd, args) {
    const arg = parseArgs(args);
    const result = pack1.resolvePath(cwd, arg);
    if (!await isDirectory(result)) {
      throw new Error(`${result}: Not a directory`);
    }
    return result;
  }
  async function isDirectory(path) {
    try {
      const info = await Deno.stat(path);
      return info.isDirectory;
    } catch (err) {
      if (err instanceof Deno.errors.NotFound) {
        return false;
      } else {
        throw err;
      }
    }
  }
  function parseArgs(args) {
    if (args.length === 0) {
      throw new Error("expected at least 1 argument");
    } else if (args.length > 1) {
      throw new Error("too many arguments");
    } else {
      return args[0];
    }
  }
  Object.defineProperty(pack9, "cdCommand", {
    get: () => cdCommand,
  });
})();
(function _src_command_ts() {
  const textDecoder = new TextDecoder();
  const builtInCommands = {
    cd: pack9.cdCommand,
    printenv: pack10.printEnvCommand,
    echo: pack12.echoCommand,
    cat: pack13.catCommand,
    exit: pack14.exitCommand,
    export: pack15.exportCommand,
    sleep: pack19.sleepCommand,
    test: pack20.testCommand,
    rm: pack17.rmCommand,
    mkdir: pack16.mkdirCommand,
    cp: pack11.cpCommand,
    mv: pack11.mvCommand,
    pwd: pack18.pwdCommand,
    touch: pack21.touchCommand,
    unset: pack22.unsetCommand,
  };
  const getRegisteredCommandNamesSymbol = Symbol();
  class CommandBuilder {
    #state = {
      command: undefined,
      combinedStdoutStderr: false,
      stdin: "inherit",
      stdoutKind: "inherit",
      stderrKind: "inherit",
      noThrow: false,
      env: {},
      cwd: undefined,
      commands: {
        ...builtInCommands,
      },
      exportEnv: false,
      printCommand: false,
      printCommandLogger: new pack1.LoggerTreeBox(console.error),
      timeout: undefined,
    };
    #getClonedState() {
      const state = this.#state;
      return {
        // be explicit here in order to evaluate each property on a case by case basis
        command: state.command,
        combinedStdoutStderr: state.combinedStdoutStderr,
        stdin: state.stdin,
        stdoutKind: state.stdoutKind,
        stderrKind: state.stderrKind,
        noThrow: state.noThrow,
        env: {
          ...state.env,
        },
        cwd: state.cwd,
        commands: {
          ...state.commands,
        },
        exportEnv: state.exportEnv,
        printCommand: state.printCommand,
        printCommandLogger: state.printCommandLogger.createChild(),
        timeout: state.timeout,
      };
    }
    #newWithState(action) {
      const builder = new CommandBuilder();
      const state = this.#getClonedState();
      action(state);
      builder.#state = state;
      return builder;
    }
    then(onfulfilled, onrejected) {
      return this.spawn().then(onfulfilled).catch(onrejected);
    }
    spawn() {
      // store a snapshot of the current command
      // in case someone wants to spawn multiple
      // commands with different state
      return parseAndSpawnCommand(this.#getClonedState());
    }
    registerCommand(command, handleFn) {
      validateCommandName(command);
      return this.#newWithState((state) => {
        state.commands[command] = handleFn;
      });
    }
    registerCommands(commands) {
      let command = this;
      for (const [key, value] of Object.entries(commands)) {
        command = command.registerCommand(key, value);
      }
      return command;
    }
    unregisterCommand(command) {
      return this.#newWithState((state) => {
        delete state.commands[command];
      });
    }
    command(command) {
      return this.#newWithState((state) => {
        if (typeof command === "string") {
          state.command = command;
        } else {
          state.command = command.map(escapeArg).join(" ");
        }
      });
    }
    noThrow(value = true) {
      return this.#newWithState((state) => {
        state.noThrow = value;
      });
    }
    captureCombined(value = true) {
      return this.#newWithState((state) => {
        state.combinedStdoutStderr = value;
        if (value) {
          if (state.stdoutKind !== "piped" && state.stdoutKind !== "inheritPiped") {
            state.stdoutKind = "piped";
          }
          if (state.stderrKind !== "piped" && state.stderrKind !== "inheritPiped") {
            state.stderrKind = "piped";
          }
        }
      });
    }
    stdin(reader) {
      return this.#newWithState((state) => {
        if (reader === "inherit" || reader === "null") {
          state.stdin = reader;
        } else if (reader instanceof Uint8Array) {
          state.stdin = new pack1.Box(new pack3.Buffer(reader));
        } else {
          state.stdin = new pack1.Box(reader);
        }
      });
    }
    stdinText(text) {
      return this.stdin(new TextEncoder().encode(text));
    }
    stdout(kind) {
      return this.#newWithState((state) => {
        if (state.combinedStdoutStderr && kind !== "piped" && kind !== "inheritPiped") {
          throw new Error("Cannot set stdout's kind to anything but 'piped' or 'inheritPiped' when combined is true.");
        }
        state.stdoutKind = kind;
      });
    }
    stderr(kind) {
      return this.#newWithState((state) => {
        if (state.combinedStdoutStderr && kind !== "piped" && kind !== "inheritPiped") {
          throw new Error("Cannot set stderr's kind to anything but 'piped' or 'inheritPiped' when combined is true.");
        }
        state.stderrKind = kind;
      });
    }
    env(nameOrItems, value) {
      return this.#newWithState((state) => {
        if (typeof nameOrItems === "string") {
          setEnv(state, nameOrItems, value);
        } else {
          for (const [key, value] of Object.entries(nameOrItems)) {
            setEnv(state, key, value);
          }
        }
      });
      function setEnv(state, key, value) {
        if (Deno.build.os === "windows") {
          key = key.toUpperCase();
        }
        state.env[key] = value;
      }
    }
    cwd(dirPath) {
      return this.#newWithState((state) => {
        state.cwd = dirPath instanceof URL
          ? pack3.path.fromFileUrl(dirPath)
          : dirPath instanceof pack6.PathRef
          ? dirPath.resolve().toString()
          : pack3.path.resolve(dirPath);
      });
    }
    exportEnv(value = true) {
      return this.#newWithState((state) => {
        state.exportEnv = value;
      });
    }
    printCommand(value = true) {
      return this.#newWithState((state) => {
        state.printCommand = value;
      });
    }
    setPrintCommandLogger(logger) {
      this.#state.printCommandLogger.setValue(logger);
    }
    quiet(kind = "both") {
      return this.#newWithState((state) => {
        if (kind === "both" || kind === "stdout") {
          state.stdoutKind = getQuietKind(state.stdoutKind);
        }
        if (kind === "both" || kind === "stderr") {
          state.stderrKind = getQuietKind(state.stderrKind);
        }
      });
      function getQuietKind(kind) {
        switch (kind) {
          case "inheritPiped":
          case "inherit":
            return "piped";
          case "null":
          case "piped":
            return kind;
          default: {
            const _assertNever = kind;
            throw new Error(`Unhandled kind ${kind}.`);
          }
        }
      }
    }
    timeout(delay) {
      return this.#newWithState((state) => {
        state.timeout = delay == null ? undefined : pack1.delayToMs(delay);
      });
    }
    async bytes() {
      return (await this.quiet("stdout")).stdoutBytes;
    }
    async text() {
      return (await this.quiet("stdout")).stdout.replace(/\r?\n$/, "");
    }
    async lines() {
      const text = await this.text();
      return text.split(/\r?\n/g);
    }
    async json() {
      return (await this.quiet("stdout")).stdoutJson;
    }
    [getRegisteredCommandNamesSymbol]() {
      return Object.keys(this.#state.commands);
    }
  }
  class CommandChild extends Promise {
    #pipedStdoutBuffer;
    #pipedStderrBuffer;
    #abortController;
    constructor(executor, options = {
      pipedStderrBuffer: undefined,
      pipedStdoutBuffer: undefined,
      abortController: undefined,
    }) {
      super(executor);
      this.#pipedStdoutBuffer = options.pipedStdoutBuffer;
      this.#pipedStderrBuffer = options.pipedStderrBuffer;
      this.#abortController = options.abortController;
    }
    abort() {
      this.#abortController?.abort();
    }
    stdout() {
      const buffer = this.#pipedStdoutBuffer;
      this.#assertBufferStreamable("stdout", buffer);
      this.#pipedStdoutBuffer = "consumed";
      this.catch(() => {
        // observe and ignore
      });
      return this.#bufferToStream(buffer);
    }
    stderr() {
      const buffer = this.#pipedStderrBuffer;
      this.#assertBufferStreamable("stderr", buffer);
      this.#pipedStderrBuffer = "consumed";
      this.catch(() => {
        // observe and ignore
      });
      return this.#bufferToStream(buffer);
    }
    #assertBufferStreamable(name, buffer) {
      if (buffer == null) {
        throw new Error(
          `No pipe available. Ensure ${name} is "piped" (not "inheritPiped") and combinedOutput is not enabled.`,
        );
      }
      if (buffer === "consumed") {
        throw new Error(`Streamable ${name} was already consumed. Use the previously acquired stream instead.`);
      }
    }
    #bufferToStream(buffer) {
      return new ReadableStream({
        start(controller) {
          buffer.setListener({
            writeSync(data) {
              controller.enqueue(data);
              return data.length;
            },
            setError(err) {
              controller.error(err);
            },
            close() {
              controller.close();
            },
          });
        },
      });
    }
  }
  function parseAndSpawnCommand(state) {
    if (state.command == null) {
      throw new Error("A command must be set before it can be spawned.");
    }
    if (state.printCommand) {
      state.printCommandLogger.getValue()(pack3.colors.white(">"), pack3.colors.blue(state.command));
    }
    const [stdoutBuffer, stderrBuffer, combinedBuffer] = getBuffers();
    const stdout = new pack23.ShellPipeWriter(
      state.stdoutKind,
      stdoutBuffer === "null" ? new pack23.NullPipeWriter() : stdoutBuffer === "inherit" ? Deno.stdout : stdoutBuffer,
    );
    const stderr = new pack23.ShellPipeWriter(
      state.stderrKind,
      stderrBuffer === "null" ? new pack23.NullPipeWriter() : stderrBuffer === "inherit" ? Deno.stderr : stderrBuffer,
    );
    const abortController = new AbortController();
    const abortSignal = abortController.signal;
    let timeoutId;
    let timedOut = false;
    if (state.timeout != null) {
      timeoutId = setTimeout(() => {
        timedOut = true;
        abortController.abort();
      }, state.timeout);
    }
    const command = state.command;
    return new CommandChild(async (resolve, reject) => {
      try {
        const list = pack24.parseCommand(command);
        const stdin = takeStdin();
        const code = await pack24.spawn(list, {
          stdin: stdin instanceof ReadableStream ? pack3.readerFromStreamReader(stdin.getReader()) : stdin,
          stdout,
          stderr,
          env: buildEnv(state.env),
          commands: state.commands,
          cwd: state.cwd ?? Deno.cwd(),
          exportEnv: state.exportEnv,
          signal: abortSignal,
        });
        if (code !== 0 && !state.noThrow) {
          if (stdin instanceof ReadableStream) {
            if (!stdin.locked) {
              stdin.cancel();
            }
          }
          if (abortSignal.aborted) {
            throw new Error(`${timedOut ? "Timed out" : "Aborted"} with exit code: ${code}`);
          } else {
            throw new Error(`Exited with code: ${code}`);
          }
        }
        resolve(
          new CommandResult(
            code,
            finalizeCommandResultBuffer(stdoutBuffer),
            finalizeCommandResultBuffer(stderrBuffer),
            combinedBuffer instanceof pack3.Buffer ? combinedBuffer : undefined,
          ),
        );
      } catch (err) {
        finalizeCommandResultBufferForError(stdoutBuffer, err);
        finalizeCommandResultBufferForError(stderrBuffer, err);
        reject(err);
      } finally {
        if (timeoutId != null) {
          clearTimeout(timeoutId);
        }
      }
    }, {
      pipedStdoutBuffer: stdoutBuffer instanceof pack23.PipedBuffer ? stdoutBuffer : undefined,
      pipedStderrBuffer: stderrBuffer instanceof pack23.PipedBuffer ? stderrBuffer : undefined,
      abortController,
    });
    function takeStdin() {
      if (state.stdin instanceof pack1.Box) {
        const stdin = state.stdin.value;
        if (stdin === "consumed") {
          throw new Error(
            "Cannot spawn command. Stdin was already consumed when a previous command using " +
              "the same stdin was spawned. You need to call `.stdin(...)` again with a new " + "value before spawning.",
          );
        }
        state.stdin.value = "consumed";
        return stdin;
      } else {
        return state.stdin;
      }
    }
    function getBuffers() {
      const hasProgressBars = pack25.isShowingProgressBars();
      const stdoutBuffer = getOutputBuffer(Deno.stdout, state.stdoutKind);
      const stderrBuffer = getOutputBuffer(Deno.stderr, state.stderrKind);
      if (state.combinedStdoutStderr) {
        if (typeof stdoutBuffer === "string" || typeof stderrBuffer === "string") {
          throw new Error("Internal programming error. Expected writers for stdout and stderr.");
        }
        const combinedBuffer = new pack3.Buffer();
        return [
          new pack23.CapturingBufferWriter(stdoutBuffer, combinedBuffer),
          new pack23.CapturingBufferWriter(stderrBuffer, combinedBuffer),
          combinedBuffer,
        ];
      }
      return [
        stdoutBuffer,
        stderrBuffer,
        undefined,
      ];
      function getOutputBuffer(innerWriter, kind) {
        switch (kind) {
          case "inherit":
            if (hasProgressBars) {
              return new pack23.InheritStaticTextBypassWriter(innerWriter);
            } else {
              return "inherit";
            }
          case "piped":
            return new pack23.PipedBuffer();
          case "inheritPiped":
            return new pack23.CapturingBufferWriter(innerWriter, new pack3.Buffer());
          case "null":
            return "null";
          default: {
            const _assertNever = kind;
            throw new Error("Unhandled.");
          }
        }
      }
    }
    function finalizeCommandResultBuffer(buffer) {
      if (buffer instanceof pack23.CapturingBufferWriter) {
        return buffer.getBuffer();
      } else if (buffer instanceof pack23.InheritStaticTextBypassWriter) {
        buffer.flush(); // this is line buffered, so flush anything left
        return "inherit";
      } else if (buffer instanceof pack23.PipedBuffer) {
        buffer.close();
        return buffer.getBuffer() ?? "streamed";
      } else {
        return buffer;
      }
    }
    function finalizeCommandResultBufferForError(buffer, error) {
      if (buffer instanceof pack23.InheritStaticTextBypassWriter) {
        buffer.flush(); // this is line buffered, so flush anything left
      } else if (buffer instanceof pack23.PipedBuffer) {
        buffer.setError(error);
      }
    }
  }
  class CommandResult {
    #stdout;
    #stderr;
    #combined;
    code;
    constructor(code, stdout, stderr, combined) {
      this.code = code;
      this.#stdout = stdout;
      this.#stderr = stderr;
      this.#combined = combined;
    }
    #memoizedStdout;
    get stdout() {
      if (!this.#memoizedStdout) {
        this.#memoizedStdout = textDecoder.decode(this.stdoutBytes);
      }
      return this.#memoizedStdout;
    }
    #memoizedStdoutJson;
    get stdoutJson() {
      if (this.#memoizedStdoutJson == null) {
        this.#memoizedStdoutJson = JSON.parse(this.stdout);
      }
      return this.#memoizedStdoutJson;
    }
    get stdoutBytes() {
      if (this.#stdout === "streamed") {
        throw new Error(`Stdout was streamed to another source and is no longer available.`);
      }
      if (typeof this.#stdout === "string") {
        throw new Error(
          `Stdout was not piped (was ${this.#stdout}). Call .stdout("piped") or .stdout("capture") when building the command.`,
        );
      }
      return this.#stdout.bytes({
        copy: false,
      });
    }
    #memoizedStderr;
    get stderr() {
      if (!this.#memoizedStderr) {
        this.#memoizedStderr = textDecoder.decode(this.stderrBytes);
      }
      return this.#memoizedStderr;
    }
    #memoizedStderrJson;
    get stderrJson() {
      if (this.#memoizedStderrJson == null) {
        this.#memoizedStderrJson = JSON.parse(this.stderr);
      }
      return this.#memoizedStderrJson;
    }
    get stderrBytes() {
      if (this.#stdout === "streamed") {
        throw new Error(`Stderr was streamed to another source and is no longer available.`);
      }
      if (typeof this.#stderr === "string") {
        throw new Error(
          `Stderr was not piped (was ${this.#stderr}). Call .stderr("piped") or .stderr("capture") when building the command.`,
        );
      }
      return this.#stderr.bytes({
        copy: false,
      });
    }
    #memoizedCombined;
    get combined() {
      if (!this.#memoizedCombined) {
        this.#memoizedCombined = textDecoder.decode(this.combinedBytes);
      }
      return this.#memoizedCombined;
    }
    get combinedBytes() {
      if (this.#combined == null) {
        throw new Error("Stdout and stderr were not combined. Call .captureCombined() when building the command.");
      }
      return this.#combined.bytes({
        copy: false,
      });
    }
  }
  function buildEnv(env) {
    const result = Deno.env.toObject();
    for (const [key, value] of Object.entries(env)) {
      if (value == null) {
        delete result[key];
      } else {
        result[key] = value;
      }
    }
    return result;
  }
  function escapeArg(arg) {
    // very basic for now
    if (/^[A-Za-z0-9]*$/.test(arg)) {
      return arg;
    } else {
      return `'${arg.replace("'", `'"'"'`)}'`;
    }
  }
  function validateCommandName(command) {
    if (command.match(/^[a-zA-Z0-9-_]+$/) == null) {
      throw new Error("Invalid command name");
    }
  }
  Object.defineProperty(pack0, "getRegisteredCommandNamesSymbol", {
    get: () => getRegisteredCommandNamesSymbol,
  });
  Object.defineProperty(pack0, "CommandBuilder", {
    get: () => CommandBuilder,
  });
  Object.defineProperty(pack0, "CommandChild", {
    get: () => CommandChild,
  });
  Object.defineProperty(pack0, "parseAndSpawnCommand", {
    get: () => parseAndSpawnCommand,
  });
  Object.defineProperty(pack0, "CommandResult", {
    get: () => CommandResult,
  });
  Object.defineProperty(pack0, "escapeArg", {
    get: () => escapeArg,
  });
})();
function sleep(delay) {
  const ms = pack1.delayToMs(delay);
  return new Promise((resolve) => setTimeout(resolve, ms));
}
async function withRetries($local, errorLogger, opts) {
  const delayIterator = pack1.delayToIterator(opts.delay);
  for (let i = 0; i < opts.count; i++) {
    if (i > 0) {
      const nextDelay = delayIterator.next();
      if (!opts.quiet) {
        $local.logWarn(`Failed. Trying again in ${pack1.formatMillis(nextDelay)}...`);
      }
      await sleep(nextDelay);
      if (!opts.quiet) {
        $local.logStep(`Retrying attempt ${i + 1}/${opts.count}...`);
      }
    }
    try {
      return await opts.action();
    } catch (err) {
      // don't bother with indentation here
      errorLogger(err);
    }
  }
  throw new Error(`Failed after ${opts.count} attempts.`);
}
function cd(path) {
  if (typeof path === "string" || path instanceof URL) {
    path = new pack6.PathRef(path);
  } else if (!(path instanceof pack6.PathRef)) {
    path = new pack6.PathRef(path).parentOrThrow();
  }
  Deno.chdir(path.toString());
}
function buildInitial$State(opts) {
  return {
    commandBuilder: new pack1.TreeBox(opts.commandBuilder ?? new pack0.CommandBuilder()),
    requestBuilder: opts.requestBuilder ?? new pack5.RequestBuilder(),
    infoLogger: new pack1.LoggerTreeBox(console.error),
    warnLogger: new pack1.LoggerTreeBox(console.error),
    errorLogger: new pack1.LoggerTreeBox(console.error),
    indentLevel: new pack1.Box(0),
    extras: opts.extras,
  };
}
const helperObject = {
  fs: pack3.fs,
  path: Object.assign(pack6.createPathRef, pack3.path),
  cd,
  escapeArg: pack0.escapeArg,
  stripAnsi(text) {
    return pack4.wasmInstance.strip_ansi_codes(text);
  },
  dedent: pack3.outdent,
  sleep,
  which(commandName) {
    if (commandName.toUpperCase() === "DENO") {
      return Promise.resolve(Deno.execPath());
    } else {
      return pack3.which(commandName);
    }
  },
  whichSync(commandName) {
    if (commandName.toUpperCase() === "DENO") {
      return Deno.execPath();
    } else {
      return pack3.whichSync(commandName);
    }
  },
};
function build$FromState(state) {
  const logDepthObj = {
    get logDepth() {
      return state.indentLevel.value;
    },
    set logDepth(value) {
      if (value < 0 || value % 1 !== 0) {
        throw new Error("Expected a positive integer.");
      }
      state.indentLevel.value = value;
    },
  };
  const result = Object.assign(
    (strings, ...exprs) => {
      let result = "";
      for (let i = 0; i < Math.max(strings.length, exprs.length); i++) {
        if (strings.length > i) {
          result += strings[i];
        }
        if (exprs.length > i) {
          result += templateLiteralExprToString(exprs[i], pack0.escapeArg);
        }
      }
      return state.commandBuilder.getValue().command(result);
    },
    helperObject,
    logDepthObj,
    {
      build$(opts = {}) {
        return build$FromState({
          commandBuilder: opts.commandBuilder != null
            ? new pack1.TreeBox(opts.commandBuilder)
            : state.commandBuilder.createChild(),
          requestBuilder: opts.requestBuilder ?? state.requestBuilder,
          errorLogger: state.errorLogger.createChild(),
          infoLogger: state.infoLogger.createChild(),
          warnLogger: state.warnLogger.createChild(),
          indentLevel: state.indentLevel,
          extras: {
            ...state.extras,
            ...opts.extras,
          },
        });
      },
      log(...data) {
        state.infoLogger.getValue()(getLogText(data));
      },
      logLight(...data) {
        state.infoLogger.getValue()(pack3.colors.gray(getLogText(data)));
      },
      logStep(firstArg, ...data) {
        logStep(firstArg, data, (t) => pack3.colors.bold(pack3.colors.green(t)), state.infoLogger.getValue());
      },
      logError(firstArg, ...data) {
        logStep(firstArg, data, (t) => pack3.colors.bold(pack3.colors.red(t)), state.errorLogger.getValue());
      },
      logWarn(firstArg, ...data) {
        logStep(firstArg, data, (t) => pack3.colors.bold(pack3.colors.yellow(t)), state.warnLogger.getValue());
      },
      logGroup(labelOrAction, maybeAction) {
        const label = typeof labelOrAction === "string" ? labelOrAction : undefined;
        if (label) {
          state.infoLogger.getValue()(getLogText([
            label,
          ]));
        }
        state.indentLevel.value++;
        const action = label != null ? maybeAction : labelOrAction;
        if (action != null) {
          let wasPromise = false;
          try {
            const result = action();
            if (result instanceof Promise) {
              wasPromise = true;
              return result.finally(() => {
                if (state.indentLevel.value > 0) {
                  state.indentLevel.value--;
                }
              });
            } else {
              return result;
            }
          } finally {
            if (!wasPromise) {
              if (state.indentLevel.value > 0) {
                state.indentLevel.value--;
              }
            }
          }
        }
      },
      logGroupEnd() {
        if (state.indentLevel.value > 0) {
          state.indentLevel.value--;
        }
      },
      commandExists(commandName) {
        if (state.commandBuilder.getValue()[pack0.getRegisteredCommandNamesSymbol]().includes(commandName)) {
          return Promise.resolve(true);
        }
        return helperObject.which(commandName).then((c) => c != null);
      },
      commandExistsSync(commandName) {
        if (state.commandBuilder.getValue()[pack0.getRegisteredCommandNamesSymbol]().includes(commandName)) {
          return true;
        }
        return helperObject.whichSync(commandName) != null;
      },
      maybeConfirm: pack2.maybeConfirm,
      confirm: pack2.confirm,
      maybeSelect: pack2.maybeSelect,
      select: pack2.select,
      maybeMultiSelect: pack2.maybeMultiSelect,
      multiSelect: pack2.multiSelect,
      maybePrompt: pack2.maybePrompt,
      prompt: pack2.prompt,
      progress(messageOrText, options) {
        const opts = typeof messageOrText === "string"
          ? (() => {
            const words = messageOrText.split(" ");
            return {
              prefix: words[0],
              message: words.length > 1 ? words.slice(1).join(" ") : undefined,
              ...options,
            };
          })()
          : messageOrText;
        return new pack2.ProgressBar((...data) => {
          state.infoLogger.getValue()(...data);
        }, opts);
      },
      setInfoLogger(logger) {
        state.infoLogger.setValue(logger);
      },
      setWarnLogger(logger) {
        state.warnLogger.setValue(logger);
      },
      setErrorLogger(logger) {
        state.errorLogger.setValue(logger);
        // also update the logger used for the print command
        const commandBuilder = state.commandBuilder.getValue();
        commandBuilder.setPrintCommandLogger(logger);
        state.commandBuilder.setValue(commandBuilder);
      },
      setPrintCommand(value1) {
        const commandBuilder = state.commandBuilder.getValue().printCommand(value1);
        state.commandBuilder.setValue(commandBuilder);
      },
      request(url) {
        return state.requestBuilder.url(url);
      },
      raw(strings, ...exprs) {
        let result = "";
        for (let i = 0; i < Math.max(strings.length, exprs.length); i++) {
          if (strings.length > i) {
            result += strings[i];
          }
          if (exprs.length > i) {
            result += templateLiteralExprToString(exprs[i]);
          }
        }
        return state.commandBuilder.getValue().command(result);
      },
      withRetries(opts) {
        return withRetries(result, state.errorLogger.getValue(), opts);
      },
    },
    state.extras,
  );
  // copy over the get/set accessors for logDepth
  const keyName = "logDepth";
  Object.defineProperty(result, keyName, Object.getOwnPropertyDescriptor(logDepthObj, keyName));
  state.requestBuilder = state.requestBuilder[pack5.withProgressBarFactorySymbol]((message) =>
    result.progress(message)
  );
  return result;
  function getLogText(data) {
    // this should be smarter to better emulate how console.log/error work
    const combinedText = data.join(" ");
    if (state.indentLevel.value === 0) {
      return combinedText;
    } else {
      const indentText = "  ".repeat(state.indentLevel.value);
      return combinedText.split(/\n/) // keep \r on line
        .map((l) => `${indentText}${l}`).join("\n");
    }
  }
  function logStep(firstArg, data, colourize, logger) {
    if (data.length === 0) {
      let i = 0;
      // skip over any leading whitespace
      while (i < firstArg.length && firstArg[i] === " ") {
        i++;
      }
      // skip over any non whitespace
      while (i < firstArg.length && firstArg[i] !== " ") {
        i++;
      }
      // emphasize the first word only
      firstArg = colourize(firstArg.substring(0, i)) + firstArg.substring(i);
    } else {
      firstArg = colourize(firstArg);
    }
    logger(getLogText([
      firstArg,
      ...data,
    ]));
  }
}
export function build$(options = {}) {
  return build$FromState(buildInitial$State({
    isGlobal: false,
    ...options,
  }));
}
function templateLiteralExprToString(expr, escape) {
  let result;
  if (expr instanceof Array) {
    return expr.map((e) => templateLiteralExprToString(e, escape)).join(" ");
  } else if (expr instanceof pack0.CommandResult) {
    // remove last newline
    result = expr.stdout.replace(/\r?\n$/, "");
  } else {
    result = `${expr}`;
  }
  return escape ? escape(result) : result;
}
export const $ = build$FromState(buildInitial$State({
  isGlobal: true,
}));
export default $;
const _packReExport1 = pack6.FsFileWrapper;
export { _packReExport1 as FsFileWrapper };
const _packReExport2 = pack6.PathRef;
export { _packReExport2 as PathRef };
const _packReExport3 = pack0.CommandBuilder;
export { _packReExport3 as CommandBuilder };
const _packReExport4 = pack0.CommandResult;
export { _packReExport4 as CommandResult };
const _packReExport5 = pack5.RequestBuilder;
export { _packReExport5 as RequestBuilder };
const _packReExport6 = pack5.RequestResult;
export { _packReExport6 as RequestResult };
