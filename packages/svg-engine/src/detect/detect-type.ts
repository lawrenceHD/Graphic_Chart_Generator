export type DetectedType = 'png' | 'jpeg' | 'webp' | 'svg' | 'unknown';

// SEC-12: the type comes from the bytes only; file names and announced Content-Type are ignored.
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG = [0xff, 0xd8, 0xff];
const SVG_SNIFF_BYTES = 4096;
const BYTE_ORDER_MARK = 0xfeff;

const startsWith = (bytes: Uint8Array, signature: readonly number[], offset = 0): boolean =>
  signature.every((value, index) => bytes[offset + index] === value);
const ascii = (bytes: Uint8Array, start: number, end: number): string =>
  String.fromCharCode(...bytes.subarray(start, end));

export function detectType(bytes: Uint8Array): DetectedType {
  if (startsWith(bytes, PNG)) return 'png';
  if (startsWith(bytes, JPEG)) return 'jpeg';
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 12) === 'WEBP') return 'webp';
  // SVG: optional UTF-8 BOM and whitespace, then `<svg`, or an XML declaration followed by `<svg`.
  const decoded = new TextDecoder('utf-8').decode(bytes.subarray(0, SVG_SNIFF_BYTES));
  const head = decoded.charCodeAt(0) === BYTE_ORDER_MARK ? decoded.slice(1) : decoded;
  const start = head.trimStart();
  if (/^<svg[\s>/]/.test(start)) return 'svg';
  if (start.startsWith('<?xml') && /<svg[\s>/]/.test(start) && !/<html[\s>]/i.test(start))
    return 'svg';
  return 'unknown';
}
