import type { AssetError } from '@app/contracts';
import { err, ok, type Result } from '@app/kernel';
import { assetError, LIMITS } from './model.js';

// 05_ENGINES.md §3.1: checks made on the bytes, before any XML parsing.
const XML_ENCODING = /^<\?xml[^>]*\bencoding\s*=\s*["']([^"']+)["']/i;
const UTF8_NAMES = new Set(['utf-8', 'utf8']);

export function decodeSvgText(bytes: Uint8Array): Result<string, AssetError> {
  if (bytes.length > LIMITS.bytes) return err(assetError('ASSET_TOO_LARGE', 'file over 5 MB'));
  if ((bytes[0] === 0xfe && bytes[1] === 0xff) || (bytes[0] === 0xff && bytes[1] === 0xfe)) {
    return err(assetError('ASSET_DECODE_FAILED', 'UTF-16 is not supported'));
  }
  let text: string;
  try {
    // fatal: invalid UTF-8 is refused instead of being replaced; the UTF-8 BOM is stripped.
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return err(assetError('ASSET_DECODE_FAILED', 'invalid UTF-8'));
  }
  const start = text.trimStart();
  if (!start.startsWith('<?xml') && !start.startsWith('<svg')) {
    return err(assetError('ASSET_TYPE_UNSUPPORTED', 'content does not start like an SVG'));
  }
  const encoding = XML_ENCODING.exec(start)?.[1];
  if (encoding !== undefined && !UTF8_NAMES.has(encoding.toLowerCase())) {
    return err(assetError('ASSET_DECODE_FAILED', 'declared encoding is not UTF-8'));
  }
  // Refused before parsing, so no entity is ever expanded (XXE, billion laughs).
  if (/<!DOCTYPE|<!ENTITY/i.test(text)) {
    return err(assetError('ASSET_SVG_FORBIDDEN_CONTENT', 'DOCTYPE or ENTITY declaration'));
  }
  return ok(start);
}
