import { deltaEOk, extractPalette } from '@app/color-engine';
import type { RasterImage } from '@app/contracts';
import { detectType, sanitizeSvg } from '@app/svg-engine';
import { createNodeRasterizer, normalizeRaster } from '@app/svg-engine/raster';
import { describe, expect, it } from 'vitest';
import { fidelityScore, monochromeSvg } from './index.js';

// Logo corpus of docs/05_ENGINES.md §6: 20 logos made for the project, the ground truth of T-005, T-008, T-011.
const DIR = '../../svg-engine/fixtures/corpus/';
// Vite needs literal glob options: no shared object.
const svgs = import.meta.glob<string>('../../svg-engine/fixtures/corpus/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
});
const rasters = import.meta.glob<string>('../../svg-engine/fixtures/corpus/*.{png,jpg}', {
  query: '?inline',
  import: 'default',
  eager: true,
});
const [manifestText = ''] = Object.values(
  import.meta.glob<string>('../../svg-engine/fixtures/corpus/manifest.json', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
);

const CATEGORIES = {
  simple: 6,
  gradient: 4,
  'mask-filter': 2,
  'thin-stroke': 2,
  'png-transparent': 2,
  'png-white': 2,
  jpeg: 2,
} as const;
type Category = keyof typeof CATEGORIES;
interface Logo {
  readonly file: string;
  readonly category: Category;
  readonly palette: readonly string[];
  /** Raster logos: the SVG they were rendered from (tools/corpus/render.mjs). */
  readonly source?: string;
  readonly iouReference?: number;
}

const isCategory = (value: unknown): value is Category =>
  typeof value === 'string' && Object.hasOwn(CATEGORIES, value);
const isHexList = (value: unknown): value is readonly string[] =>
  Array.isArray(value) &&
  value.every((hex) => typeof hex === 'string' && /^#[0-9A-F]{6}$/.test(hex));
function toLogo(entry: unknown): Logo {
  const get = (name: string): unknown => Reflect.get(Object(entry), name);
  const file = get('file');
  const category = get('category');
  const palette = get('palette');
  const source = get('source');
  const iouReference = get('iouReference');
  if (typeof file !== 'string' || !isCategory(category) || !isHexList(palette)) {
    throw new Error(`invalid manifest entry: ${JSON.stringify(entry)}`);
  }
  if (source !== undefined && typeof source !== 'string') throw new Error(file);
  if (iouReference !== undefined && typeof iouReference !== 'number') throw new Error(file);
  return {
    file,
    category,
    palette,
    ...(source === undefined ? {} : { source }),
    ...(iouReference === undefined ? {} : { iouReference }),
  };
}
const parsed: unknown = JSON.parse(manifestText);
const list: unknown = Reflect.get(Object(parsed), 'logos');
const entries: unknown[] = Array.isArray(list) ? list : [];
const logos = entries.map(toLogo);

const rasterizer = createNodeRasterizer();
const ANALYSIS_WIDTH = 512; // §2.4: images reduced to 512 px by the caller
// ΔE_OK between a hand-written colour and its nearest cluster. A flat colour is found exactly; a gradient is cut
// into slices whose centres only approach its stops (§2.4 steps 6–7), so a stop is matched by its hue family.
const TOLERANCE = { flat: 0.01, gradient: 0.1 } as const;
const EXTRA_SHARE = 0.02; // §2.5: share from which a cluster becomes an `accent` or `extra` candidate

function decodeDataUrl(url: string): Uint8Array {
  const binary = atob(url.slice(url.indexOf(',') + 1));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
async function render(logo: Logo): Promise<RasterImage> {
  const svg = svgs[DIR + logo.file];
  const result =
    svg === undefined
      ? await normalizeRaster(decodeDataUrl(rasters[DIR + logo.file] ?? ''))
      : await rasterizer.rasterize(sanitized(svg), ANALYSIS_WIDTH);
  if (!result.ok) throw new Error(`${logo.file}: ${result.error.reason}`);
  return result.value;
}
function sanitized(svg: string): string {
  const result = sanitizeSvg(new TextEncoder().encode(svg));
  if (!result.ok) throw new Error(result.error.code);
  return result.value.svg;
}
const isGradient = (logo: Logo): boolean =>
  logo.category === 'gradient' ||
  logos.some((other) => other.file === logo.source && other.category === 'gradient');

describe('logo corpus (05_ENGINES.md §6)', () => {
  it('holds 20 logos split as §6 requires, every file listed once', () => {
    const counts = Object.fromEntries(Object.keys(CATEGORIES).map((name) => [name, 0]));
    for (const logo of logos) counts[logo.category] = (counts[logo.category] ?? 0) + 1;
    expect(counts).toEqual(CATEGORIES);
    const files = [...Object.keys(svgs), ...Object.keys(rasters)].map((path) =>
      path.slice(DIR.length),
    );
    expect(logos.map((logo) => logo.file).sort()).toEqual(files.sort());
  });

  it('every file is accepted: SVG by the sanitizer without warning, raster by its magic bytes', () => {
    for (const logo of logos) {
      const svg = svgs[DIR + logo.file];
      if (svg !== undefined) {
        const result = sanitizeSvg(new TextEncoder().encode(svg));
        expect(result.ok && result.value.warnings, logo.file).toEqual([]);
      } else {
        const expected = logo.file.endsWith('.jpg') ? 'jpeg' : 'png';
        expect(detectType(decodeDataUrl(rasters[DIR + logo.file] ?? '')), logo.file).toBe(expected);
      }
    }
  });

  it.each(logos.map((logo) => [logo.file, logo] as const))(
    'palette of %s: hand-written colours found, no unexpected cluster',
    async (_file, logo) => {
      const image = await render(logo);
      const palette = extractPalette({
        width: image.width,
        height: image.height,
        data: new Uint8ClampedArray(image.rgba),
      });
      if (!palette.ok) throw new Error(palette.error);
      const { clusters } = palette.value;
      const tolerance = isGradient(logo) ? TOLERANCE.gradient : TOLERANCE.flat;
      for (const hex of logo.palette) {
        const nearest = Math.min(...clusters.map((cluster) => deltaEOk(hex, cluster.hex)));
        expect(nearest, `${logo.file} ${hex}`).toBeLessThanOrEqual(tolerance);
      }
      // A gradient's intermediate slices (blue between cyan and violet) are expected, not parasites.
      if (isGradient(logo)) return;
      const unexpected = clusters.filter(
        (cluster) =>
          cluster.share >= EXTRA_SHARE &&
          !logo.palette.some((hex) => deltaEOk(hex, cluster.hex) <= tolerance),
      );
      expect(unexpected.map((cluster) => cluster.hex)).toEqual([]);
    },
  );

  it.each(
    logos
      .filter((logo) => logo.iouReference !== undefined)
      .map((logo) => [logo.file, logo] as const),
  )('monochrome variants of %s: expected path, fidelity at its reference', async (_file, logo) => {
    const original = sanitized(svgs[DIR + logo.file] ?? '');
    for (const target of ['#000000', '#FFFFFF'] as const) {
      const variant = monochromeSvg(original, target);
      if (!variant.ok) throw new Error(variant.error.reason);
      expect(variant.value.path).toBe(
        logo.category === 'mask-filter' ? 'raster-fallback-needed' : 'structural',
      );
      const score = await fidelityScore(original, variant.value.svg, rasterizer);
      if (!score.ok) throw new Error(score.error.reason);
      expect(score.value, `${logo.file} ${target}`).toBeGreaterThanOrEqual(logo.iouReference ?? 1);
    }
  });
});
