// The monochrome variants of logo-kit paint every surface #000000: a single-colour version of the logo
// is the same drawing with that black replaced (a structural recolour, never a filter on pixels).
const HEX = /^#[\da-f]{6}$/iu;
const BLACK = /(fill|stroke)="#000000"/giu;

export function tintSvg(svg: string, hex: string): string | null {
  if (!HEX.test(hex)) return null;
  return svg.replace(BLACK, (_match, property: string) => `${property}="${hex.toUpperCase()}"`);
}

/** data: URL of an SVG document (img-src allows data:). */
export function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
