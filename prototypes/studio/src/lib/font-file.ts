import { parse } from 'opentype.js';

// Reading a font the user owns (research note 2026-10-19 §3.1): names, licence text and the OS/2 fsType
// embedding rights, which decide what the charter may do with it. The verdict is a technical signal, not
// legal advice: the interface always shows the licence text next to it.
export type Embedding = 'installable' | 'editable' | 'preview-print' | 'restricted' | 'unknown';

export interface FontInfo {
  readonly family: string;
  readonly style: string;
  readonly designer: string | null;
  readonly license: string | null;
  readonly licenseUrl: string | null;
  readonly embedding: Embedding;
  readonly subsetting: boolean;
  readonly glyphs: number;
  /** Family name registered with FontFace for previews (unique per upload). */
  readonly cssFamily: string;
}

const pick = (record: Record<string, string> | undefined): string | null =>
  record ? (record.en ?? Object.values(record)[0] ?? null) : null;

/** OpenType OS/2 fsType: bit 1 restricted, bit 2 preview & print, bit 3 editable; 0 installable. */
export function embeddingOf(fsType: number): Embedding {
  if (fsType & 0x0002) return 'restricted';
  if (fsType & 0x0004) return 'preview-print';
  if (fsType & 0x0008) return 'editable';
  return 'installable';
}

export const EMBEDDING_TEXT: Record<
  Embedding,
  { label: string; detail: string; tone: 'ok' | 'mid' | 'bad' }
> = {
  installable: {
    label: 'Incorporation libre',
    detail: 'La police peut être incorporée dans les exports (PDF en sous-ensemble).',
    tone: 'ok',
  },
  editable: {
    label: 'Incorporation autorisée',
    detail: 'Incorporable dans les exports, documents modifiables compris.',
    tone: 'ok',
  },
  'preview-print': {
    label: 'Aperçu et impression',
    detail: 'Incorporable pour l’affichage et l’impression, pas en document modifiable.',
    tone: 'mid',
  },
  restricted: {
    label: 'Incorporation interdite',
    detail: 'Aperçu seulement dans le studio : jamais incorporée dans un export.',
    tone: 'bad',
  },
  unknown: {
    label: 'Licence non lue',
    detail: 'Format compressé (WOFF2) : aperçu possible, licence à vérifier avant tout export.',
    tone: 'mid',
  },
};

let uploads = 0;

export async function readFontFile(file: File): Promise<FontInfo> {
  const buffer = await file.arrayBuffer();
  uploads += 1;
  const cssFamily = `UserFont${String(uploads)}`;
  // The browser renders every web format (WOFF2 included); the preview never depends on the parser.
  const face = new FontFace(cssFamily, buffer);
  await face.load();
  document.fonts.add(face);
  let font: ReturnType<typeof parse> | null = null;
  try {
    font = parse(buffer);
  } catch {
    font = null; // WOFF2 (Brotli) is not read by opentype.js: preview only, licence unknown
  }
  if (font === null) {
    return {
      family: file.name.replace(/\.[^.]+$/, ''),
      style: '',
      designer: null,
      license: null,
      licenseUrl: null,
      embedding: 'unknown',
      subsetting: false,
      glyphs: 0,
      cssFamily,
    };
  }
  const names = font.names as unknown as Record<string, Record<string, string> | undefined>;
  const os2 = (font.tables as Record<string, { fsType?: number } | undefined>).os2;
  const fsType = os2?.fsType ?? 0;
  return {
    family: pick(names.fontFamily) ?? file.name,
    style: pick(names.fontSubfamily) ?? '',
    designer: pick(names.designer),
    license: pick(names.license),
    licenseUrl: pick(names.licenseURL),
    embedding: embeddingOf(fsType),
    subsetting: (fsType & 0x0100) === 0,
    glyphs: font.glyphs.length,
    cssFamily,
  };
}
