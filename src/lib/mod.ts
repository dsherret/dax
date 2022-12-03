import { fs, localDataDir, path } from "../deps.ts";
import { instantiate } from "./rs_lib.generated.js";

export async function instantiateWithCaching() {
  let url = new URL("rs_lib_bg.wasm", import.meta.url);
  if (url.protocol !== "file:") {
    url = (await cacheLocalDir(url)) ?? url;
  }
  return instantiate({ url });
}

async function cacheLocalDir(url: URL) {
  const localPath = await getUrlLocalPath(url);
  if (localPath == null) {
    return undefined;
  }
  if (!await fs.exists(localPath)) {
    const fileBytes = await getUrlBytes(url);
    await Deno.writeFile(localPath, new Uint8Array(fileBytes));
  }
  return path.toFileUrl(localPath);
}

async function getUrlLocalPath(url: URL) {
  try {
    const dataDirPath = await getInitializedLocalDataDirPath();
    const version = getUrlVersion(url);
    return path.join(dataDirPath, version + ".wasm");
  } catch {
    return undefined;
  }
}

async function getInitializedLocalDataDirPath() {
  const dataDir = localDataDir();
  if (dataDir == null) {
    throw new Error(`Could not find local data directory.`);
  }
  const dirPath = path.join(dataDir, "dax");
  await fs.ensureDir(dirPath);
  return dirPath;
}

function getUrlVersion(url: URL) {
  const version = url.pathname.match(/([0-9]+)\.([0-9]+)\.([0-9]+)/)?.[0];
  if (version == null) {
    throw new Error(`Could not find version in url: ${url}`);
  }
  return version;
}

async function getUrlBytes(url: URL) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Error downloading ${url}: ${response.statusText}`);
  }
  return await response.arrayBuffer();
}
