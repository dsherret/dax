const units = ["B", "KiB", "MiB", "GiB", "TiB", "PiB", "EiB", "ZiB", "YiB"];

export function humanDownloadSize(byteCount: number, totalBytes?: number) {
  const exponentBasis = totalBytes ?? byteCount
  const exponent = Math.min(units.length - 1, Math.floor(Math.log(exponentBasis) / Math.log(1024)));
  const unit = units[exponent];
  const prettyBytes = (Math.floor(byteCount / Math.pow(1024, exponent) * 100) / 100).toFixed(exponent === 0 ? 0 : 2);
  return `${prettyBytes} ${unit}`;
}
