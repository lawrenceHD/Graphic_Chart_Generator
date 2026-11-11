import { MAX_BRIEF_DOC_BYTES, detectManifestFormat, type AssetErrorCode } from '@app/contracts';
import { err, ok, type Result } from '@app/kernel';

// Client pre-check before an upload (AC-02.1 to AC-02.3): it saves a round trip for an obvious mistake.
// The type comes from the bytes, never from the name (AC-02.2); the server scan stays the only authority.
// `pdf` includes Illustrator files (saved with PDF compatibility); `eps` includes legacy .ai. The worker
// reads both with its vector converter (ADR-033), or refuses them when it has none.
export type LogoFileType = 'svg' | 'png' | 'jpeg' | 'webp' | 'pdf' | 'eps';

/** Bytes to read from the start of the file: enough for an XML prolog and comments before <svg>. */
export const LOGO_FILE_HEAD_BYTES = 1024;

const MiB = 1024 * 1024;
// 01_PRODUCT_MVP.md §3.
const MAX_BYTES: Readonly<Record<LogoFileType, number>> = {
  svg: 5 * MiB,
  png: 10 * MiB,
  jpeg: 10 * MiB,
  webp: 10 * MiB,
  pdf: 10 * MiB,
  eps: 10 * MiB,
};

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG = [0xff, 0xd8, 0xff];
const RIFF = [0x52, 0x49, 0x46, 0x46];
const WEBP = [0x57, 0x45, 0x42, 0x50];
const DOS_EPS = [0xc5, 0xd0, 0xd3, 0xc6];
const PDF = /^%PDF-\d/;
const POSTSCRIPT = /^%!PS-Adobe/;
// Optional BOM, XML declaration, comments and doctype, then the root element.
const SVG_ROOT = /^﻿?\s*(?:<\?xml[^>]*>\s*)?(?:<!--[\s\S]*?-->\s*|<!DOCTYPE[^>]*>\s*)*<svg[\s>/]/i;

const startsWith = (head: Uint8Array, signature: readonly number[], offset = 0): boolean =>
  signature.every((byte, index) => head[offset + index] === byte);

function sniff(head: Uint8Array): LogoFileType | null {
  if (startsWith(head, PNG)) return 'png';
  if (startsWith(head, JPEG)) return 'jpeg';
  if (startsWith(head, RIFF) && startsWith(head, WEBP, 8)) return 'webp';
  if (startsWith(head, DOS_EPS)) return 'eps';
  const text = new TextDecoder('utf-8', { fatal: false }).decode(head);
  if (PDF.test(text)) return 'pdf';
  if (POSTSCRIPT.test(text)) return 'eps';
  return SVG_ROOT.test(text) ? 'svg' : null;
}

export type BrandFileKind =
  | { readonly kind: 'logo'; readonly type: LogoFileType }
  | { readonly kind: 'document'; readonly format: 'text' | 'docx' | 'pdf' };

// The bytes of a PDF do not say whether it holds a logo or a brief. The name only chooses the role, never
// the type: an Illustrator file, or a PDF named as a logo, is a logo; any other PDF is read as a brief.
const NAMED_AS_LOGO = /(?:\.ai$|(?:^|[^a-z])logo)/iu;

/**
 * A dropped file is a logo, or a manifest document (txt, md, docx, PDF), told from the bytes, with the
 * name deciding only what a PDF is for. Same caveat as above: the server decides.
 */
export function checkBrandFile(
  size: number,
  head: Uint8Array,
  name: string,
): Result<BrandFileKind, AssetErrorCode> {
  const logo = checkLogoFile(size, head);
  if (logo.ok && !(logo.value === 'pdf' && !NAMED_AS_LOGO.test(name)))
    return ok({ kind: 'logo', type: logo.value });
  if (!logo.ok && logo.error !== 'ASSET_TYPE_UNSUPPORTED') return err(logo.error);
  const format = detectManifestFormat(head);
  if (format === null) return err('ASSET_TYPE_UNSUPPORTED');
  return size > MAX_BRIEF_DOC_BYTES ? err('ASSET_TOO_LARGE') : ok({ kind: 'document', format });
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
