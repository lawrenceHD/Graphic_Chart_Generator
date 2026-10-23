import { sanitizeSvg } from '@app/svg-engine';
import { createNodeRasterizer } from '@app/svg-engine/raster';
import { describe, expect, it } from 'vitest';
import { monochromeVariant, withoutBackdrop } from './index.js';

// A logo extracted from a PDF charter often comes with its presentation backdrop: the white page, then a
// pastel panel filling the crop, both painted before the logo (Instacart on « Cashew »). Painted in the
// target colour, the backdrop turns the monochrome variant into a solid block.
const rasterizer = createNodeRasterizer();
const OPEN = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 40">';
function sanitized(body: string): string {
  const result = sanitizeSvg(new TextEncoder().encode(`${OPEN}${body}</svg>`));
  if (!result.ok) throw new Error(result.error.code);
  return result.value.svg;
}
async function stripped(svg: string): Promise<string> {
  const result = await withoutBackdrop(svg, rasterizer);
  if (!result.ok) throw new Error(result.error.reason);
  return result.value;
}

const INK =
  '<rect x="10" y="10" width="60" height="20" fill="#003D29"/>' +
  '<rect x="30" y="16" width="8" height="8" fill="#FAF1E5"/>' +
  '<circle cx="95" cy="20" r="10" fill="#FF7009"/>';
const PDF_EXPORT = sanitized(
  '<defs><clipPath id="crop"><rect width="120" height="40"/></clipPath></defs>' +
    '<g clip-path="url(#crop)"><rect x="-500" y="-500" width="1920" height="1080" fill="#FFFFFF"/>' +
    `<path d="M0 0H120V40H0Z" fill="#FAF1E5"/>${INK}</g>`,
);

describe('withoutBackdrop: presentation backdrop of an extracted logo', () => {
  it('drops the leading full-bleed page and pastel panel, keeps a later pastel knockout', async () => {
    const svg = await stripped(PDF_EXPORT);

    expect(svg).not.toContain('#FFFFFF');
    expect(svg.match(/#FAF1E5/g)).toHaveLength(1);
    expect(svg).toContain('#003D29');
    expect(svg).toContain('#FF7009');
  });

  it('keeps a rounded app tile: the tile is the logo', async () => {
    const tile = sanitized(`<rect width="120" height="40" rx="12" fill="#FAF1E5"/>${INK}`);
    expect(await stripped(tile)).toBe(tile);
  });

  it('keeps a vivid flat: a logo shown on its brand colour (decision B)', async () => {
    const flat = sanitized(`<rect width="120" height="40" fill="#E24329"/>${INK}`);
    expect(await stripped(flat)).toBe(flat);
  });

  it('keeps a dark full-bleed square: a badge, not a page', async () => {
    const badge = sanitized(
      '<rect width="120" height="40" fill="#1A1A1A"/><circle cx="60" cy="20" r="10" fill="#FFFFFF"/>',
    );
    expect(await stripped(badge)).toBe(badge);
  });

  it('reads the fill a backdrop inherits from the root', async () => {
    const result = sanitizeSvg(
      new TextEncoder().encode(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 40" fill="#FAF1E5"><rect width="120" height="40"/>${INK}</svg>`,
      ),
    );
    if (!result.ok) throw new Error(result.error.code);
    expect(await stripped(result.value.svg)).not.toContain('width="120"');
  });

  it('keeps a pastel panel that does not fill the canvas', async () => {
    const panel = sanitized(`<rect width="120" height="34" fill="#FAF1E5"/>${INK}`);
    expect(await stripped(panel)).toBe(panel);
  });

  it('keeps a logo that is nothing but a pastel square', async () => {
    const square = sanitized('<rect width="120" height="40" fill="#FAF1E5"/>');
    expect(await stripped(square)).toBe(square);
  });

  it('gives a white variant that is the logo, not a white block', async () => {
    const result = await monochromeVariant(PDF_EXPORT, '#FFFFFF', rasterizer);
    if (!result.ok) throw new Error(result.error.reason);
    const image = await rasterizer.rasterize(result.value.svg, 120);
    if (!image.ok) throw new Error(image.error.reason);
    const alpha = (x: number, y: number): number => image.value.rgba[(y * 120 + x) * 4 + 3] ?? -1;

    expect(alpha(2, 2)).toBe(0);
    expect(alpha(20, 20)).toBe(255);
    expect(alpha(95, 20)).toBe(255);
  });
});
