import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { ensureViewBox, sanitizeSvg } from '../index.js';
import { createNodeRasterizer, normalizeRaster } from './index.js';
import { childExecArgv } from './node-rasterizer.js';

const encode = (text: string): Uint8Array => new TextEncoder().encode(text);
function sanitized(svg: string): string {
  const result = sanitizeSvg(encode(svg));
  if (!result.ok) throw new Error(result.error.code);
  return result.value.svg;
}
async function pixel(png: Uint8Array, x: number, y: number): Promise<number[]> {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const offset = (y * info.width + x) * 4;
  return [...data.subarray(offset, offset + 4)];
}

const rasterizer = createNodeRasterizer();

describe('rasterize in an isolated child process (T-008, SEC-15)', () => {
  it('renders a known red square: red centre, transparent corner', async () => {
    const svg = sanitized(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><rect x="5" y="5" width="10" height="10" fill="#FF0000"/></svg>',
    );
    const result = await rasterizer.rasterize(svg, 100);
    if (!result.ok) throw new Error(result.error.reason);

    expect([result.value.width, result.value.height]).toEqual([100, 100]);
    expect(result.value.rgba).toHaveLength(100 * 100 * 4);
    const centre = (50 * 100 + 50) * 4;
    expect([...result.value.rgba.subarray(centre, centre + 4)]).toEqual([255, 0, 0, 255]);
    expect(await pixel(result.value.png, 50, 50)).toEqual([255, 0, 0, 255]);
    expect((await pixel(result.value.png, 1, 1))[3]).toBe(0);
  });

  it('refuses an SVG that sanitizeSvg did not produce', async () => {
    const raw =
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>';
    const result = await rasterizer.rasterize(raw, 10);
    expect(!result.ok && result.error.code).toBe('RASTER_NOT_SANITIZED');
  });

  it('kills the child and reports ASSET_SCAN_TIMEOUT past the delay', async () => {
    const pids: number[] = [];
    const slow = createNodeRasterizer({ timeoutMs: 150, onSpawn: (pid) => pids.push(pid) });
    const blurs = Array.from(
      { length: 40 },
      (_, index) => `<feGaussianBlur stdDeviation="${String(30 + index)}"/>`,
    ).join('');
    const svg = sanitized(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><filter id="f">${blurs}</filter><rect width="100" height="100" filter="url(#f)"/></svg>`,
    );
    const result = await slow.rasterize(svg, 4000);

    expect(!result.ok && result.error.code).toBe('ASSET_SCAN_TIMEOUT');
    expect(pids).toHaveLength(1);
    expect(() => process.kill(pids[0] ?? -1, 0)).toThrow();
  });

  it('computes the bounding box of content filling half the viewBox (±0.5)', async () => {
    const svg = sanitized(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="50" height="100"/></svg>',
    );
    const box = await rasterizer.bbox(svg);
    if (!box.ok) throw new Error(box.error.reason);
    const { x, y, width, height } = box.value;
    expect(Math.abs(x)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(y)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(width - 50)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(height - 100)).toBeLessThanOrEqual(0.5);
  });

  it('completes a missing viewBox from the bounding box (10_QUALITY.md case 29)', async () => {
    const result = sanitizeSvg(
      encode(
        '<svg xmlns="http://www.w3.org/2000/svg"><rect x="10" y="20" width="30" height="40"/></svg>',
      ),
    );
    if (!result.ok) throw new Error(result.error.code);
    const completed = await ensureViewBox(result.value, rasterizer);
    if (!completed.ok) throw new Error(completed.error.reason);

    expect(completed.value).toContain('viewBox="10 20 30 40"');
    expect(sanitizeSvg(encode(completed.value))).toMatchObject({
      ok: true,
      value: { svg: completed.value },
    });
  });

  // resvg 2.6.2 panics (geom.rs:27) and kills the child when a clipped, masked or translucent group has
  // all its content outside the canvas: PDF exports are full of them (6 of the 8 corpus charters).
  it('renders groups lying outside the viewBox like the same logo without them', async () => {
    const shape = '<rect x="3.3" y="2.7" width="9.1" height="6.4" fill="#C0392B"/>';
    const offCanvas = [
      '<g clip-path="url(#c)"><rect x="-500" y="2" width="20" height="20"/></g>',
      '<g mask="url(#m)"><rect x="300" y="400" width="20" height="20"/></g>',
      '<g opacity="0.5"><rect x="-40" y="-60" width="20" height="20"/></g>',
    ].join('');
    const defs =
      '<defs><clipPath id="c"><rect x="-900" y="-900" width="2000" height="2000"/></clipPath>' +
      '<mask id="m"><rect x="-900" y="-900" width="2000" height="2000" fill="#FFFFFF"/></mask></defs>';
    const open = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="1.5 0.5 15 10">';
    const expected = await rasterizer.rasterize(sanitized(`${open}${shape}</svg>`), 77);
    const result = await rasterizer.rasterize(
      sanitized(`${open}${defs}${offCanvas}${shape}</svg>`),
      77,
    );
    if (!expected.ok) throw new Error(expected.error.reason);
    if (!result.ok) throw new Error(result.error.reason);

    expect([result.value.width, result.value.height]).toEqual([
      expected.value.width,
      expected.value.height,
    ]);
    expect(Buffer.from(result.value.rgba).equals(Buffer.from(expected.value.rgba))).toBe(true);
    const probes: [number, number][] = [
      [20, 20],
      [0, 0],
      [10, 13],
    ];
    for (const [x, y] of probes) {
      expect(await pixel(result.value.png, x, y)).toEqual(await pixel(expected.value.png, x, y));
    }
  });

  // A PDF page around the logo puts such groups far away: widening the canvas up to them would exceed
  // its cap at mockup widths (BlaBlaCar at 1600 px, Porto at 3000 px). They are dropped instead.
  it('renders far off-canvas groups at a large width without crashing', async () => {
    const shape = '<rect x="3.3" y="2.7" width="9.1" height="6.4" fill="#C0392B"/>';
    const farAway = [
      '<g clip-path="url(#c)"><rect x="-50000" y="2" width="20" height="20"/></g>',
      '<g transform="translate(90000 0)"><g opacity="0.5"><rect x="0" y="0" width="20" height="20"/></g></g>',
      '<g clip-path="url(#c)"><g mask="url(#m)"><rect x="5" y="40000" width="20" height="20"/></g></g>',
      // Glyphs of a PDF caption: resvg turns each use into a group (Porto at 3000 px)
      '<g clip-path="url(#c)"><rect x="2" y="1" width="1" height="1" fill="#C0392B" opacity="0"/>' +
        '<use href="#glyph" transform="matrix(7,0,0,-7,-40000,-18000)"/></g>',
    ].join('');
    const defs =
      '<defs><clipPath id="c"><rect x="-90000" y="-90000" width="200000" height="200000"/></clipPath>' +
      '<mask id="m"><rect x="-90000" y="-90000" width="200000" height="200000" fill="#FFFFFF"/></mask>' +
      '<path id="glyph" d="M0 0H.5V.7H0Z"/></defs>';
    const open = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="1.5 0.5 15 10">';
    const expected = await rasterizer.rasterize(sanitized(`${open}${shape}</svg>`), 1600);
    const result = await rasterizer.rasterize(
      sanitized(`${open}${defs}${farAway}${shape}</svg>`),
      1600,
    );
    if (!expected.ok) throw new Error(expected.error.reason);
    if (!result.ok) throw new Error(result.error.reason);

    expect(Buffer.from(result.value.rgba).equals(Buffer.from(expected.value.rgba))).toBe(true);
  });

  it('keeps a translucent group that reaches into the viewBox', async () => {
    const open = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">';
    const far = '<g clip-path="url(#c)"><rect x="-90000" y="0" width="20" height="20"/></g>';
    const defs =
      '<defs><clipPath id="c"><rect x="-90000" y="-90000" width="200000" height="200000"/></clipPath></defs>';
    const visible =
      '<g opacity="0.5"><rect x="-90000" y="0" width="90005" height="10" fill="#000000"/></g>';
    const result = await rasterizer.rasterize(
      sanitized(`${open}${defs}${far}${visible}</svg>`),
      100,
    );
    if (!result.ok) throw new Error(result.error.reason);

    expect((await pixel(result.value.png, 20, 50))[3]).toBe(128);
    expect((await pixel(result.value.png, 80, 50))[3]).toBe(0);
  });
});

describe('child confinement (SEC-15)', () => {
  it('cannot read the repository root (where .env.local lives) nor start a process', () => {
    const repositoryFile = fileURLToPath(new URL('../../../../package.json', import.meta.url));
    const probe = (code: string): number | null =>
      spawnSync(process.execPath, [...childExecArgv(), '-e', code], { stdio: 'ignore', env: {} })
        .status;

    expect(probe(`require('fs').readFileSync(${JSON.stringify(repositoryFile)})`)).not.toBe(0);
    expect(probe(`require('child_process').execFileSync(process.execPath, ['-v'])`)).not.toBe(0);
    expect(probe('1 + 1')).toBe(0);
  });
});

describe('normalizeRaster (05_ENGINES.md §4)', () => {
  it('refuses a 9000 × 100 PNG', async () => {
    const png = await sharp({
      create: { width: 9000, height: 100, channels: 3, background: '#fff' },
    })
      .png()
      .toBuffer();
    const result = await normalizeRaster(new Uint8Array(png));
    expect(!result.ok && result.error.code).toBe('ASSET_TOO_LARGE');
  });

  it('applies EXIF orientation 6 and strips metadata', async () => {
    const jpeg = await sharp({ create: { width: 20, height: 10, channels: 3, background: '#f00' } })
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer();
    const result = await normalizeRaster(new Uint8Array(jpeg));
    if (!result.ok) throw new Error(result.error.reason);
    const metadata = await sharp(result.value.png).metadata();

    expect([result.value.width, result.value.height]).toEqual([10, 20]);
    expect([metadata.format, metadata.channels, metadata.orientation, metadata.exif]).toEqual([
      'png',
      4,
      undefined,
      undefined,
    ]);
  });

  it('reports a truncated PNG as ASSET_DECODE_FAILED', async () => {
    const png = await sharp({ create: { width: 64, height: 64, channels: 4, background: '#00f' } })
      .png()
      .toBuffer();
    const result = await normalizeRaster(
      new Uint8Array(png.subarray(0, Math.floor(png.length / 2))),
    );
    expect(!result.ok && result.error.code).toBe('ASSET_DECODE_FAILED');
  });

  it('refuses a non-raster file whatever its name', async () => {
    const result = await normalizeRaster(encode('<svg xmlns="http://www.w3.org/2000/svg"/>'));
    expect(!result.ok && result.error.code).toBe('ASSET_TYPE_UNSUPPORTED');
  });
});

describe('RGBA pixels of the port', () => {
  it('are straight alpha: an anti-aliased white edge stays white', async () => {
    const svg = sanitized(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40.5" fill="#FFFFFF"/></svg>',
    );
    const result = await rasterizer.rasterize(svg, 100);
    if (!result.ok) throw new Error(result.error.reason);
    const { rgba } = result.value;
    const edges: number[] = [];
    for (let offset = 0; offset < rgba.length; offset += 4) {
      const alpha = rgba[offset + 3] ?? 0;
      if (alpha > 0 && alpha < 255) edges.push(rgba[offset] ?? 0);
    }
    expect(edges.length).toBeGreaterThan(0);
    expect(Math.min(...edges)).toBeGreaterThanOrEqual(250);
  });
});
