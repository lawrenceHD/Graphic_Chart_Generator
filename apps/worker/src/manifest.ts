import { inflateRawSync } from 'node:zlib';
import {
  detectManifestFormat,
  sanitizeManifestText,
  type AssetErrorCode,
  type ManifestFormat,
} from '@app/contracts';
import { err, ok, type Result } from '@app/kernel';

// Manifest document → clean text. No dependency: plain text, and DOCX read with node:zlib (a DOCX is a ZIP
// holding word/document.xml). Only that one entry is ever inflated, never written to disk (no zip slip),
// capped while inflating (zip bomb), and XML entities are decoded from a fixed list (no XXE, no expansion).
// PDF is recognised and refused with its own code here; the scan reads it with the vector converter when
// one is configured (ADR-033), then cleans its text with manifestOfText.

export interface Manifest {
  readonly format: ManifestFormat;
  readonly text: string;
  readonly filteredLines: number;
  readonly truncated: boolean;
}

const MAX_ENTRIES = 1000;
const MAX_XML_BYTES = 8 * 1024 * 1024;
const MAX_RAW_TEXT = 200_000;
const DOCUMENT_PART = 'word/document.xml';
const EOCD = 0x06054b50;
const CENTRAL = 0x02014b50;
const LOCAL = 0x04034b50;

const view = (bytes: Uint8Array): DataView =>
  new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

function findEndRecord(bytes: Uint8Array): number {
  const data = view(bytes);
  const lowest = Math.max(0, bytes.length - 22 - 0xffff);
  for (let at = bytes.length - 22; at >= lowest; at -= 1) {
    if (data.getUint32(at, true) === EOCD) return at;
  }
  return -1;
}

/** The inflated word/document.xml, or the reason it cannot be read. */
function readDocumentPart(bytes: Uint8Array): Result<string, AssetErrorCode> {
  const data = view(bytes);
  const end = findEndRecord(bytes);
  if (end < 0) return err('ASSET_DECODE_FAILED');
  const count = data.getUint16(end + 10, true);
  if (count > MAX_ENTRIES) return err('ASSET_DOCUMENT_TOO_COMPLEX');
  let at = data.getUint32(end + 16, true);
  for (let index = 0; index < count; index += 1) {
    if (at + 46 > bytes.length || data.getUint32(at, true) !== CENTRAL)
      return err('ASSET_DECODE_FAILED');
    const flags = data.getUint16(at + 8, true);
    const method = data.getUint16(at + 10, true);
    const compressed = data.getUint32(at + 20, true);
    const nameLength = data.getUint16(at + 28, true);
    const extraLength = data.getUint16(at + 30, true);
    const commentLength = data.getUint16(at + 32, true);
    const local = data.getUint32(at + 42, true);
    const name = new TextDecoder().decode(bytes.subarray(at + 46, at + 46 + nameLength));
    at += 46 + nameLength + extraLength + commentLength;
    if (name !== DOCUMENT_PART) continue;
    if ((flags & 1) !== 0 || (method !== 0 && method !== 8)) return err('ASSET_DECODE_FAILED');
    if (local + 30 > bytes.length || data.getUint32(local, true) !== LOCAL)
      return err('ASSET_DECODE_FAILED');
    // Sizes come from the central directory; the local header only tells where the data starts.
    const start = local + 30 + data.getUint16(local + 26, true) + data.getUint16(local + 28, true);
    if (start + compressed > bytes.length) return err('ASSET_DECODE_FAILED');
    const body = bytes.subarray(start, start + compressed);
    if (method === 0)
      return body.length > MAX_XML_BYTES
        ? err('ASSET_DOCUMENT_TOO_COMPLEX')
        : ok(new TextDecoder().decode(body));
    try {
      return ok(new TextDecoder().decode(inflateRawSync(body, { maxOutputLength: MAX_XML_BYTES })));
    } catch (error) {
      // zlib reports the output cap as a RangeError (ERR_BUFFER_TOO_LARGE); anything else is a bad stream.
      return err(
        error instanceof RangeError ? 'ASSET_DOCUMENT_TOO_COMPLEX' : 'ASSET_DECODE_FAILED',
      );
    }
  }
  return err('ASSET_DECODE_FAILED');
}

const ENTITIES: Readonly<Record<string, string>> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
};

function decodeEntities(text: string): string {
  return text.replace(
    /&(?:#x([0-9a-f]{1,6})|#(\d{1,7})|(\w+));/giu,
    (whole: string, hex: string | undefined, dec: string | undefined, name: string | undefined) => {
      const code =
        hex !== undefined ? Number.parseInt(hex, 16) : dec !== undefined ? Number(dec) : -1;
      if (code < 0) return ENTITIES[name ?? ''] ?? whole;
      const valid = code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff);
      return valid ? String.fromCodePoint(code) : '';
    },
  );
}

/** Text of the runs of a WordprocessingML body; paragraphs, tabs and breaks keep their separators. */
function wordText(xml: string): { text: string; cut: boolean } {
  let out = '';
  let inText = false;
  let cut = false;
  for (const match of xml.matchAll(/<[^>]*>|[^<]+/gu)) {
    const token = match[0];
    if (token.startsWith('<')) {
      const name = /^<\/?\s*([\w:.-]+)/u.exec(token)?.[1];
      const closing = token.startsWith('</');
      const selfClosing = token.endsWith('/>');
      if (name === 'w:t') inText = !closing && !selfClosing;
      else if (closing && name === 'w:p') out += '\n';
      else if (!closing && name === 'w:tab') out += '\t';
      else if (!closing && (name === 'w:br' || name === 'w:cr')) out += '\n';
    } else if (inText) out += decodeEntities(token);
    if (out.length > MAX_RAW_TEXT) {
      cut = true;
      break;
    }
  }
  return { text: out, cut };
}

export function extractManifest(bytes: Uint8Array): Result<Manifest, AssetErrorCode> {
  const format = detectManifestFormat(bytes);
  if (format === null) return err('ASSET_TYPE_UNSUPPORTED');
  if (format === 'pdf') return err('ASSET_PDF_UNSUPPORTED');
  let raw: string;
  let cut = false;
  if (format === 'text') {
    cut = bytes.length > MAX_RAW_TEXT * 4;
    try {
      // `stream` tolerates a character cut by the limit; invalid UTF-8 is refused, never turned into U+FFFD.
      raw = new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(0, MAX_RAW_TEXT * 4), {
        stream: true,
      });
    } catch {
      return err('ASSET_DECODE_FAILED');
    }
  } else {
    const xml = readDocumentPart(bytes);
    if (!xml.ok) return xml;
    const words = wordText(xml.value);
    raw = words.text;
    cut = words.cut;
  }
  return manifestOfText(format, raw, cut);
}

/** Text read elsewhere (a PDF, by the vector converter of ADR-033) → the same cleaned, capped manifest. */
export function manifestOfText(
  format: ManifestFormat,
  raw: string,
  cut = false,
): Result<Manifest, AssetErrorCode> {
  const capped = raw.length > MAX_RAW_TEXT;
  const cleaned = sanitizeManifestText(capped ? raw.slice(0, MAX_RAW_TEXT) : raw);
  if (cleaned.text.length === 0) return err('ASSET_DOCUMENT_EMPTY');
  return ok({ format, ...cleaned, truncated: cleaned.truncated || cut || capped });
}
