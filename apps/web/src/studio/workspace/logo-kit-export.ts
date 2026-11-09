import { zipSync } from 'fflate';
import { svgDataUrl, tintSvg } from '../../brand/logo-tint';
import type { BrandView } from './brand-view';
import { fileStem } from './export-files';

// The logo kit (R5 of 16_GUIDELINE_RULES.md): every official version as SVG for print and code, and as
// transparent PNG at three widths for office tools, plus the upload untouched. Built in the browser from
// the stored files; nothing is redrawn — the PNGs are renders of the SVGs, the tint a structural recolour.
export const PNG_WIDTHS = [512, 1024, 2048] as const;

export interface KitEntry {
  readonly path: string;
  /** File to read (our API). */
  readonly source: string;
  /** svg: the SVG text; png: a render `width` pixels wide; raw: the file's bytes. */
  readonly format: 'svg' | 'png' | 'raw';
  readonly width?: number;
  /** Colour replacing the variant's black (one-colour version). */
  readonly tint?: string;
}

export function logoKitPlan(view: BrandView): KitEntry[] {
  const stem = fileStem(view.name);
  const root = `${stem}-logo`;
  const entries: KitEntry[] = [
    { path: `${root}/original/${stem}-original`, source: view.logo.color, format: 'raw' },
  ];
  const version = (name: string, source: string | null, svg: boolean, tint?: string) => {
    if (source === null) return;
    const base = `${root}/${name}/${stem}-${name}`;
    const extra = tint === undefined ? {} : { tint };
    if (svg) entries.push({ path: `${base}.svg`, source, format: 'svg', ...extra });
    for (const width of PNG_WIDTHS)
      entries.push({
        path: `${base}-${String(width)}.png`,
        source,
        format: 'png',
        width,
        ...extra,
      });
  };
  // The colour version is the traced drawing of a raster upload, or the upload when it is a vector.
  version('couleur', view.logo.vector ?? view.logo.color, view.logo.vector !== null);
  version('noir', view.logo['mono-black'], true);
  version('blanc', view.logo['mono-white'], true);
  version('couleur-principale', view.logo['mono-black'], true, view.colors.primary);
  // Lockups the owner supplied (any file type): exported as PNG only.
  version('horizontal', view.logo.horizontal ?? null, false);
  version('vertical', view.logo.vertical ?? null, false);
  return entries;
}

export function readme(view: BrandView): string {
  const { rules, colors } = view;
  return [
    `${view.name} — logo`,
    '',
    'couleur/             version principale, sur fond clair',
    'noir/, blanc/        une seule encre : documents noir et blanc, fonds sombres ou photos',
    'couleur-principale/  une seule encre dans la couleur de la marque',
    'original/            le fichier déposé, inchangé',
    '',
    'SVG : impression, signalétique, code. PNG (fond transparent) : bureautique, réseaux sociaux.',
    '',
    `Zone de protection : ${String(Math.round(rules.clearSpaceRatio * 100))} % de la hauteur du logo, sur chaque côté.`,
    `Taille minimale : ${String(rules.minSizePx)} px à l’écran, ${String(rules.minSizeMm)} mm imprimé.`,
    '',
    `Couleurs : principale ${colors.primary}, accent ${colors.accent}, clair ${colors.neutralLight}, sombre ${colors.neutralDark}.`,
    '',
  ].join('\n');
}

async function render(svg: string, width: number): Promise<Uint8Array> {
  const image = new Image();
  image.decoding = 'async';
  image.src = svgDataUrl(svg);
  await image.decode();
  const ratio = image.naturalHeight / Math.max(1, image.naturalWidth);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = Math.max(1, Math.round(width * ratio));
  const context = canvas.getContext('2d');
  if (context === null) throw new Error('canvas 2d unavailable');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/png');
  });
  if (blob === null) throw new Error('png encoding failed');
  return new Uint8Array(await blob.arrayBuffer());
}

/** Raster upload drawn at `width` (the colour version of a logo that has no vector). */
async function renderRaster(bytes: Uint8Array, width: number): Promise<Uint8Array> {
  const bitmap = await createImageBitmap(new Blob([bytes.slice().buffer]));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = Math.max(1, Math.round((width * bitmap.height) / Math.max(1, bitmap.width)));
  const context = canvas.getContext('2d');
  if (context === null) throw new Error('canvas 2d unavailable');
  context.imageSmoothingQuality = 'high';
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/png');
  });
  if (blob === null) throw new Error('png encoding failed');
  return new Uint8Array(await blob.arrayBuffer());
}

const EXTENSIONS: Readonly<Record<string, string>> = {
  'image/svg+xml': '.svg',
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
};

/** Reads every file of the plan and returns the zip's bytes. */
export async function buildLogoKit(view: BrandView): Promise<Uint8Array> {
  const plan = logoKitPlan(view);
  const files: Record<string, Uint8Array> = {};
  const fetched = new Map<string, Promise<{ bytes: Uint8Array; type: string }>>();
  const read = (source: string) => {
    const known = fetched.get(source);
    if (known !== undefined) return known;
    const loading = fetch(source).then(async (response) => {
      if (!response.ok) throw new Error(`logo file ${String(response.status)}`);
      return {
        bytes: new Uint8Array(await response.arrayBuffer()),
        type: (response.headers.get('content-type') ?? '').split(';')[0] ?? '',
      };
    });
    fetched.set(source, loading);
    return loading;
  };
  const encoder = new TextEncoder();
  for (const entry of plan) {
    const { bytes, type } = await read(entry.source);
    if (entry.format === 'raw') {
      files[`${entry.path}${EXTENSIONS[type] ?? ''}`] = bytes;
      continue;
    }
    if (type !== 'image/svg+xml') {
      files[entry.path] = await renderRaster(bytes, entry.width ?? 1024);
      continue;
    }
    const text = new TextDecoder().decode(bytes);
    const svg = entry.tint === undefined ? text : (tintSvg(text, entry.tint) ?? text);
    files[entry.path] =
      entry.format === 'svg' ? encoder.encode(svg) : await render(svg, entry.width ?? 1024);
  }
  files[`${fileStem(view.name)}-logo/LISEZMOI.txt`] = encoder.encode(readme(view));
  return zipSync(files, { level: 6 });
}
