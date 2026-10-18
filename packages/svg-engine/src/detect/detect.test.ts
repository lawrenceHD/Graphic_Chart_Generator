import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import * as engine from '../index.js';
import { detectType } from './detect-type.js';
import { downscaleNearest } from './downscale.js';

const bytes = (...values: number[]): Uint8Array => new Uint8Array(values);
const text = (value: string): Uint8Array => new TextEncoder().encode(value);

describe('detectType (magic bytes, SEC-12)', () => {
  it.each([
    ['png', bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0)],
    ['jpeg', bytes(0xff, 0xd8, 0xff, 0xe0, 0)],
    ['webp', text('RIFF\u0000\u0000\u0000\u0000WEBPVP8 ')],
    ['svg', text('<svg xmlns="http://www.w3.org/2000/svg"/>')],
    ['svg', text(`${String.fromCharCode(0xfeff)} \n\t<?xml version="1.0"?>\n<!-- x --><svg/>`)],
    ['unknown', text('<!doctype html><html><svg/></html>')],
    ['unknown', text('<?xml version="1.0"?><html/>')],
    ['unknown', text('GIF89a')],
    ['unknown', new Uint8Array(0)],
  ])('detects %s', (expected, input) => {
    expect(detectType(input)).toBe(expected);
  });
});

describe('downscaleNearest', () => {
  it('keeps small images unchanged and caps the longest side', () => {
    const small = { width: 4, height: 2, data: new Uint8ClampedArray(32) };
    expect(downscaleNearest(small)).toBe(small);
    const large = downscaleNearest({
      width: 2048,
      height: 1024,
      data: new Uint8ClampedArray(2048 * 1024 * 4),
    });
    expect([large.width, large.height]).toEqual([512, 256]);
  });

  it('never introduces a colour absent from the source', () => {
    const pixel = fc.tuple(fc.nat(255), fc.nat(255), fc.nat(255), fc.nat(255));
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 40 }),
        fc.integer({ min: 1, max: 40 }),
        fc.array(pixel, { minLength: 1, maxLength: 4 }),
        (width, height, palette) => {
          const data = new Uint8ClampedArray(width * height * 4);
          for (let index = 0; index < width * height; index += 1)
            data.set(palette[index % palette.length] ?? [0, 0, 0, 0], index * 4);
          const reduced = downscaleNearest({ width, height, data }, 7);
          const source = new Set(palette.map((rgba) => rgba.join(',')));
          expect(Math.max(reduced.width, reduced.height)).toBeLessThanOrEqual(Math.max(7, 1));
          for (let index = 0; index < reduced.width * reduced.height; index += 1) {
            expect(source.has([...reduced.data.slice(index * 4, index * 4 + 4)].join(','))).toBe(
              true,
            );
          }
        },
      ),
    );
  });
});

describe('main entry point (ADR-016)', () => {
  it('exports nothing from src/raster', () => {
    const names = Object.keys(engine);
    expect(names).toEqual(
      expect.arrayContaining(['sanitizeSvg', 'detectType', 'downscaleNearest']),
    );
    expect(names.filter((name) => /raster|normalize/i.test(name))).toEqual([]);
  });
});
