import { describe, expect, it } from 'vitest';
import { LOGO_FILE_HEAD_BYTES, checkLogoFile } from './logo-file';

const MiB = 1024 * 1024;
const bytes = (...values: number[]) => Uint8Array.from(values);
const text = (value: string) => new TextEncoder().encode(value);

const PNG = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13);
const JPEG = bytes(0xff, 0xd8, 0xff, 0xe0, 0, 16);
const WEBP = text('RIFF\u0000\u0000\u0000\u0000WEBPVP8 ');
const SVG = text('<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg"></svg>');

describe('checkLogoFile (AC-02.1 to AC-02.3, client pre-check only: the server scan decides)', () => {
  it('reads the type from the bytes, never from the name', () => {
    expect(checkLogoFile(PNG.length, PNG)).toEqual({ ok: true, value: 'png' });
    expect(checkLogoFile(JPEG.length, JPEG)).toEqual({ ok: true, value: 'jpeg' });
    expect(checkLogoFile(WEBP.length, WEBP)).toEqual({ ok: true, value: 'webp' });
    expect(checkLogoFile(SVG.length, SVG)).toEqual({ ok: true, value: 'svg' });
  });

  it('accepts an SVG after a byte order mark, whitespace or a comment', () => {
    const head = text('﻿  \n<!-- Logo --><svg viewBox="0 0 1 1"/>');
    expect(checkLogoFile(head.length, head)).toEqual({ ok: true, value: 'svg' });
  });

  it('refuses unknown, empty or look-alike content', () => {
    const refused = { ok: false, error: 'ASSET_TYPE_UNSUPPORTED' };
    expect(checkLogoFile(0, new Uint8Array())).toEqual(refused);
    expect(checkLogoFile(4, text('%PDF'))).toEqual(refused);
    expect(checkLogoFile(12, text('RIFF\u0000\u0000\u0000\u0000WAVE'))).toEqual(refused);
    expect(checkLogoFile(20, text('<html><body></body>'))).toEqual(refused);
    expect(checkLogoFile(PNG.length - 1, PNG.subarray(0, 7))).toEqual(refused);
  });

  it('applies the size limits of 01 §3: 5 MiB for SVG, 10 MiB for raster', () => {
    expect(checkLogoFile(5 * MiB, SVG).ok).toBe(true);
    expect(checkLogoFile(5 * MiB + 1, SVG)).toEqual({ ok: false, error: 'ASSET_TOO_LARGE' });
    expect(checkLogoFile(10 * MiB, PNG).ok).toBe(true);
    expect(checkLogoFile(10 * MiB + 1, PNG)).toEqual({ ok: false, error: 'ASSET_TOO_LARGE' });
  });

  it('needs only the first bytes of the file', () => {
    expect(LOGO_FILE_HEAD_BYTES).toBeGreaterThanOrEqual(512);
  });
});
