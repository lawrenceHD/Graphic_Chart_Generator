import type { AssetErrorCode } from '@app/contracts';
import { err, ok, type Result } from '@app/kernel';

// Client pre-check before an upload (AC-02.1 to AC-02.3): it saves a round trip for an obvious mistake.
// The type comes from the bytes, never from the name (AC-02.2); the server scan stays the only authority.
export type LogoFileType = 'svg' | 'png' | 'jpeg' | 'webp';

/** Bytes to read from the start of the file: enough for an XML prolog and comments before <svg>. */
export const LOGO_FILE_HEAD_BYTES = 1024;

const MiB = 1024 * 1024;
// 01_PRODUCT_MVP.md §3.
const MAX_BYTES: Readonly<Record<LogoFileType, number>> = {
  svg: 5 * MiB,
  png: 10 * MiB,
  jpeg: 10 * MiB,
  webp: 10 * MiB,
};

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG = [0xff, 0xd8, 0xff];
const RIFF = [0x52, 0x49, 0x46, 0x46];
const WEBP = [0x57, 0x45, 0x42, 0x50];
// Optional BOM, XML declaration, comments and doctype, then the root element.
const SVG_ROOT = /^﻿?\s*(?:<\?xml[^>]*>\s*)?(?:<!--[\s\S]*?-->\s*|<!DOCTYPE[^>]*>\s*)*<svg[\s>/]/i;

const startsWith = (head: Uint8Array, signature: readonly number[], offset = 0): boolean =>
  signature.every((byte, index) => head[offset + index] === byte);

function sniff(head: Uint8Array): LogoFileType | null {
  if (startsWith(head, PNG)) return 'png';
  if (startsWith(head, JPEG)) return 'jpeg';
  if (startsWith(head, RIFF) && startsWith(head, WEBP, 8)) return 'webp';
  const text = new TextDecoder('utf-8', { fatal: false }).decode(head);
  return SVG_ROOT.test(text) ? 'svg' : null;
}

/** `head` holds the first LOGO_FILE_HEAD_BYTES bytes (or the whole file when smaller). */
export function checkLogoFile(
  size: number,
  head: Uint8Array,
): Result<LogoFileType, AssetErrorCode> {
  const type = sniff(head);
  if (type === null) return err('ASSET_TYPE_UNSUPPORTED');
  return size > MAX_BYTES[type] ? err('ASSET_TOO_LARGE') : ok(type);
}
