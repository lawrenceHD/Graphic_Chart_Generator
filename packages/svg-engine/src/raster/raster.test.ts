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
