export async function stat(
  path: string,
  test: (info: Deno.FileInfo) => boolean,
) {
  try {
    const info = await Deno.lstat(path);
    return test(info);
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      return false;
    } else {
      throw err;
    }
  }
}
