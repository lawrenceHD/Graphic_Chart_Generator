import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import vectors from '../../../../docs/golden/color.golden.json' with { type: 'json' };
import { deltaEOk, hexToOklab, hexToOklch } from '../oklab.js';
import { parseHex } from '../hex.js';
import { assignRoles, brandClusters, DEFAULT_EXTRACT_OPTIONS, extractPalette } from './index.js';
import { clusterColors, histogram } from './cluster.js';
import { makeImage, rgba, TRANSPARENT, type Rgba } from './test-images.js';
import type { PaletteCluster } from './types.js';

function clustersOf(image: Parameters<typeof extractPalette>[0]): readonly PaletteCluster[] {
  const result = extractPalette(image);
  if (!result.ok) throw new Error(result.error);
  return result.value.clusters;
}

function expectHexNear(actual: string, expected: string): void {
  const a = parseHex(actual);
  const b = parseHex(expected);
  if (!a.ok || !b.ok) throw new Error(`invalid hex ${actual} / ${expected}`);
  const tolerance = vectors._meta.tolerances.gamutHexPerChannel;
  expect(Math.abs(a.value.r - b.value.r)).toBeLessThanOrEqual(tolerance);
  expect(Math.abs(a.value.g - b.value.g)).toBeLessThanOrEqual(tolerance);
  expect(Math.abs(a.value.b - b.value.b)).toBeLessThanOrEqual(tolerance);
}

const RED = rgba('#FF0000');
const BLUE = rgba('#0000FF');
const WHITE = rgba('#FFFFFF');

describe('extractPalette (05_ENGINES.md §2.4)', () => {
  it('1. two flat areas 60/40: primary is the larger, accent the other, both extracted', () => {
    const clusters = clustersOf(makeImage(100, 50, (x) => (x < 60 ? RED : BLUE)));
    const roles = assignRoles(clusters);

    expect(roles.primary).toEqual({ hex: '#FF0000', source: 'extracted' });
    expect(roles.accent).toEqual({ hex: '#0000FF', source: 'extracted' });
  });

  it('1 bis. keeps close but distinct colours apart (ΔE_OK ≈ 0.17 > mergeThreshold)', () => {
    const clusters = clustersOf(makeImage(100, 50, (x) => (x < 50 ? RED : rgba('#FF8800'))));

    expect(clusters.map((cluster) => cluster.hex)).toEqual(['#FF0000', '#FF8800']);
  });

  it('2. excludes an opaque white background around a two-colour logo', () => {
    const image = makeImage(100, 100, (x, y) => {
      if (x < 20 || x >= 80 || y < 20 || y >= 80) return WHITE;
      return y < 50 ? RED : BLUE;
    });

    expect(clustersOf(image).map((cluster) => cluster.hex)).toEqual(['#0000FF', '#FF0000']);
  });

  it('keeps the colour of a transparent logo whose shapes touch the image edges', () => {
    // Tight render of a one-colour mark: its opaque border pixels are all logo, none is a background.
    const image = makeImage(100, 40, (x, y) =>
      x < 10 || x >= 90 || (y >= 10 && y < 30) ? BLUE : TRANSPARENT,
    );

    expect(clustersOf(image).map((cluster) => cluster.hex)).toEqual(['#0000FF']);
  });

  it('excludes a white background with JPEG-like noise', () => {
    const image = makeImage(100, 100, (x, y) => {
      if (x >= 20 && x < 80 && y >= 20 && y < 80) return y < 50 ? RED : BLUE;
      const noise = (k: number): number => 255 - ((x * 7 + y * 13 + k * 5) % 7);
      return [noise(0), noise(1), noise(2), 255];
    });

    expect(clustersOf(image).map((cluster) => cluster.hex)).toEqual(['#0000FF', '#FF0000']);
  });

  it('excludes the white background of a tight crop where the logo touches two edges', () => {
    const image = makeImage(100, 60, (x, y) => {
      if (y < 15 || y >= 45) return WHITE;
      return x >= 40 && x < 60 ? BLUE : RED;
    });

    expect(clustersOf(image).map((cluster) => cluster.hex)).toEqual(['#FF0000', '#0000FF']);
  });

  it('removes the JPEG halo connected to the background, keeps a light grey shape', () => {
    // Red square ringed by a 3 px bluish-white halo (ΔE_OK 0.048 from white), and a #E0E0E0 bar (0.093).
    const image = makeImage(100, 100, (x, y) => {
      if (x >= 30 && x < 70 && y >= 30 && y < 70) return RED;
      if (x >= 27 && x < 73 && y >= 27 && y < 73) return rgba('#EAF1FF');
      if (x >= 10 && x < 90 && y >= 80 && y < 90) return rgba('#E0E0E0');
      return WHITE;
    });

    expect(clustersOf(image).map((cluster) => cluster.hex)).toEqual(['#FF0000', '#E0E0E0']);
  });

  it('looks inside a thin presentation frame for the background, and drops the frame', () => {
    // 2 px light-blue frame line, white background, red / blue logo (a framed Pinterest export).
    const image = makeImage(100, 100, (x, y) => {
      if (Math.min(x, y, 99 - x, 99 - y) < 2) return rgba('#8090D0');
      if (x >= 30 && x < 70 && y >= 30 && y < 70) return y < 50 ? RED : BLUE;
      return WHITE;
    });
    const result = extractPalette(image);
    if (!result.ok) throw new Error(result.error);

    expect(result.value.clusters.map((cluster) => cluster.hex)).toEqual(['#0000FF', '#FF0000']);
    expect(result.value.background?.hex).toBe('#FFFFFF');
  });

  it('a transparent margin is not a frame: a padded square icon keeps its colour as a cluster', () => {
    const image = makeImage(100, 100, (x, y) => {
      if (Math.min(x, y, 99 - x, 99 - y) < 2) return TRANSPARENT;
      return x >= 35 && x < 65 && y >= 20 && y < 80 ? WHITE : RED;
    });
    const result = extractPalette(image);
    if (!result.ok) throw new Error(result.error);

    expect(result.value.background).toBeNull();
    expect(result.value.clusters.map((cluster) => cluster.hex)).toEqual(['#FF0000', '#FFFFFF']);
  });

  it('a rounded tile cropped tight on white is not mistaken for a framed background', () => {
    // Dark tile, corner radius 20, on white: the white corners and dark sides are no uniform frame.
    const DARK = rgba('#202830');
    const image = makeImage(100, 100, (x, y) => {
      const cx = Math.min(Math.max(x, 20), 79);
      const cy = Math.min(Math.max(y, 20), 79);
      if (Math.hypot(x + 0.5 - (cx + 0.5), y + 0.5 - (cy + 0.5)) > 20) return WHITE;
      return x >= 40 && x < 60 && y >= 30 && y < 70 ? WHITE : DARK;
    });

    expect(clustersOf(image).map((cluster) => cluster.hex)).toContain('#202830');
  });

  it('3. drops the blended edge pixels of an anti-aliased disk', () => {
    // 4x4 supersampling on an opaque white background, as a renderer flattening a logo would produce.
    const disk = rgba('#1F4BFF');
    const image = makeImage(100, 100, (x, y) => {
      let covered = 0;
      for (let sy = 0; sy < 4; sy += 1) {
        for (let sx = 0; sx < 4; sx += 1) {
          if (Math.hypot(x + (sx + 0.5) / 4 - 50, y + (sy + 0.5) / 4 - 50) <= 30) covered += 1;
        }
      }
      const t = covered / 16;
      const mix = (channel: number): number => Math.round(channel * t + 255 * (1 - t));
      return [mix(disk[0]), mix(disk[1]), mix(disk[2]), 255];
    });

    expect(clustersOf(image).map((cluster) => cluster.hex)).toEqual(['#1F4BFF']);
  });

  it('4. black-only logo: black primary, derived accent and neutrals in gamut', () => {
    const roles = assignRoles(
      clustersOf(
        makeImage(40, 40, (x, y) =>
          x > 9 && x < 30 && y > 9 && y < 30 ? rgba('#000000') : TRANSPARENT,
        ),
      ),
    );
    const golden = vectors.derivedColors.find((entry) => entry.primary === '#000000');
    if (!golden) throw new Error('golden #000000 missing');

    expect(roles.primary).toEqual({ hex: '#000000', source: 'extracted' });
    expect([roles.accent.source, roles.neutralLight.source, roles.neutralDark.source]).toEqual([
      'derived',
      'derived',
      'derived',
    ]);
    expectHexNear(roles.accent.hex, golden.accent);
    expectHexNear(roles.neutralLight.hex, golden.neutralLight);
    expectHexNear(roles.neutralDark.hex, golden.neutralDark);
  });

  it('5. gradient: at most 8 clusters, sorted by share, shares summing to 1', () => {
    const clusters = clustersOf(makeImage(256, 8, (x) => [255 - x, 0, x, 255]));
    const shares = clusters.map((cluster) => cluster.share);

    expect(clusters.length).toBeLessThanOrEqual(8);
    expect(shares).toEqual([...shares].sort((a, b) => b - a));
    expect(Math.abs(shares.reduce((sum, share) => sum + share, 0) - 1)).toBeLessThanOrEqual(1e-9);
  });

  it('6. one-pixel strokes: edge exclusion falls back and the palette is not empty', () => {
    const inside = (v: number): boolean => v >= 10 && v < 90;
    const image = makeImage(100, 100, (x, y) =>
      inside(x) && inside(y) && (x % 10 === 5 || y % 10 === 5) ? rgba('#111111') : WHITE,
    );

    expect(clustersOf(image).map((cluster) => cluster.hex)).toContain('#111111');
  });

  it('7. a fully transparent image is EMPTY_IMAGE', () => {
    expect(extractPalette(makeImage(10, 10, () => TRANSPARENT))).toEqual({
      ok: false,
      error: 'EMPTY_IMAGE',
    });
  });

  it('8. the same bands in another order give a byte-identical result', () => {
    const bands: readonly Rgba[] = [RED, BLUE, rgba('#00AA00'), WHITE];
    const forward = makeImage(20, 40, (_x, y) => bands[Math.floor(y / 10)] ?? WHITE);
    const reversed = makeImage(20, 40, (_x, y) => bands[3 - Math.floor(y / 10)] ?? WHITE);

    expect(JSON.stringify(clustersOf(reversed))).toBe(JSON.stringify(clustersOf(forward)));
  });

  it('9. property: stable output, clusters tight before reduction, distinct roles', () => {
    const colour = fc.constantFrom(
      RED,
      BLUE,
      WHITE,
      rgba('#101010'),
      rgba('#F0B000'),
      rgba('#2E7D32'),
    );
    fc.assert(
      fc.property(fc.array(colour, { minLength: 64, maxLength: 64 }), (cells) => {
        const image = makeImage(
          16,
          16,
          (x, y) => cells[Math.floor(y / 2) * 8 + Math.floor(x / 2)] ?? WHITE,
        );
        const first = extractPalette(image);
        expect(extractPalette(image)).toEqual(first);
        if (!first.ok) return;

        const raw = clusterColors(
          histogram(image, new Set()),
          DEFAULT_EXTRACT_OPTIONS.mergeThreshold,
        );
        for (const cluster of raw) {
          for (const member of cluster.members) {
            expect(deltaEOk(member.hex, cluster.center)).toBeLessThan(0.04);
          }
        }
        const total = first.value.clusters.reduce((sum, cluster) => sum + cluster.share, 0);
        expect(Math.abs(total - 1)).toBeLessThanOrEqual(1e-9);
        const roles = assignRoles(first.value.clusters);
        const extracted = [
          roles.primary,
          roles.accent,
          roles.neutralDark,
          roles.neutralLight,
          ...roles.extra,
        ]
          .filter((token) => token.source === 'extracted')
          .map((token) => token.hex);
        expect(new Set(extracted).size).toBe(extracted.length);
      }),
      { numRuns: 60 },
    );
  });
});

describe('cluster centre after a merge (decision C)', () => {
  it('the centre becomes the heaviest colour of the merged cluster', () => {
    // 100 columns: red 64 %, a blue pair #159EEF 11 % + #1A9AEA 10 % (one cluster), plain cyan #00C2FF 15 %.
    const image = makeImage(100, 10, (x) =>
      x < 64 ? RED : x < 75 ? rgba('#159EEF') : x < 85 ? rgba('#1A9AEA') : rgba('#00C2FF'),
    );
    const result = extractPalette(image, { maxClusters: 2 });
    if (!result.ok) throw new Error(result.error);

    // The cyan (15 %) is merged into the blue cluster, whose heaviest single colour it now is.
    expect(result.value.clusters.map((cluster) => cluster.hex)).toEqual(['#FF0000', '#00C2FF']);
    // Columns at a colour change are blended edges (step 3): 96 of the 100 columns are counted.
    expect(result.value.clusters[1]?.share).toBeCloseTo(33 / 96, 9);
  });
});

describe('removed background proposed as a brand colour (decision B)', () => {
  // App-icon style: a white letter on a full-bleed brand-coloured square.
  const tile = (square: Rgba) =>
    makeImage(100, 100, (x, y) => (x >= 35 && x < 65 && y >= 20 && y < 80 ? WHITE : square));
  function paletteOf(image: Parameters<typeof extractPalette>[0]) {
    const result = extractPalette(image);
    if (!result.ok) throw new Error(result.error);
    return result.value;
  }

  it('reports the removed background with its share of the retained pixels', () => {
    const palette = paletteOf(tile(RED));

    expect(palette.clusters.map((cluster) => cluster.hex)).toEqual(['#FFFFFF']);
    expect(palette.background?.hex).toBe('#FF0000');
    expect(palette.background?.share).toBeCloseTo(0.82, 2);
  });

  it('a vivid background leads the brand clusters, so it becomes the primary', () => {
    const roles = assignRoles(brandClusters(paletteOf(tile(RED))));

    expect(roles.primary).toEqual({ hex: '#FF0000', source: 'extracted' });
  });

  it('a white or pastel background is not proposed', () => {
    for (const square of [rgba('#FAF1E5'), rgba('#E8F0FF')]) {
      const palette = paletteOf(
        makeImage(100, 100, (x, y) => (x >= 35 && x < 65 && y >= 20 && y < 80 ? RED : square)),
      );

      expect(brandClusters(palette).map((cluster) => cluster.hex)).toEqual(['#FF0000']);
    }
  });

  it('brand cluster shares still sum to 1', () => {
    const shares = brandClusters(paletteOf(tile(BLUE))).map((cluster) => cluster.share);

    expect(shares.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
  });

  it('no background: brand clusters are the clusters', () => {
    const palette = paletteOf(makeImage(100, 50, (x) => (x < 60 ? RED : BLUE)));

    expect(palette.background).toBeNull();
    expect(brandClusters(palette)).toEqual(palette.clusters);
  });
});

describe('derived colours (05_ENGINES.md §2.6, golden derivedColors)', () => {
  it.each(vectors.derivedColors)('derives the roles of a lone $primary', (entry) => {
    // A one-colour image is a uniform background for step 2; the lone cluster is built directly.
    const lone = {
      hex: entry.primary,
      share: 1,
      oklab: hexToOklab(entry.primary),
      oklch: hexToOklch(entry.primary),
    };
    const roles = assignRoles([lone], { fallbackHue: entry.fallbackHue });

    expect(roles.primary.hex).toBe(entry.primary);
    expectHexNear(roles.accent.hex, entry.accent);
    expectHexNear(roles.neutralLight.hex, entry.neutralLight);
    expectHexNear(roles.neutralDark.hex, entry.neutralDark);
  });
});
