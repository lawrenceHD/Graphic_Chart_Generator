import type { LogoVersion } from '@app/mockup-engine';
import type { BrandView } from '../workspace/brand-view';

// Files the compositor reads: the images, the logo versions and the key a render depends on.
export function loadImage(src: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.decoding = 'async';
  // Logo files are redirected to the object storage (another origin, CORS-enabled): without CORS the
  // image would taint the canvas and WebGL would refuse it.
  image.crossOrigin = 'anonymous';
  image.src = src;
  return image.decode().then(() => image);
}

/** The logo file for a version: the vector drawing when there is one, the upload otherwise. */
export function logoSource(view: BrandView, version: LogoVersion): string {
  if (version === 'white') return view.logo['mono-white'] ?? view.logo.color;
  if (version === 'black') return view.logo['mono-black'] ?? view.logo.color;
  return view.logo.vector ?? view.logo.color;
}

/** Colours of the logo: the palette's main colours, its neutrals when they were read on the logo. */
export function brandInks(view: BrandView): string[] {
  const neutrals = (['neutralLight', 'neutralDark'] as const)
    .filter((role) => view.sources[role] === 'extracted')
    .map((role) => view.colors[role]);
  return [view.colors.primary, view.colors.accent, ...view.extra, ...neutrals];
}

/** What the render depends on: a view with the same colours and files keeps the picture. */
export function renderKey(view: BrandView): string {
  const { colors, logo } = view;
  return [
    colors.primary,
    colors.accent,
    colors.neutralLight,
    colors.neutralDark,
    ...view.extra,
    logo.color,
    logo.vector,
    logo['mono-black'],
    logo['mono-white'],
  ].join('|');
}

const LOGO_TEXELS = 2048;
/** The logo drawn on a canvas LOGO_TEXELS wide (an SVG is rasterised at that size, never upscaled). */
export async function logoTexture(
  src: string,
): Promise<{ canvas: HTMLCanvasElement; aspect: number }> {
  const image = await loadImage(src);
  const aspect = image.naturalWidth / Math.max(1, image.naturalHeight);
  const canvas = document.createElement('canvas');
  canvas.width = LOGO_TEXELS;
  canvas.height = Math.max(1, Math.round(LOGO_TEXELS / aspect));
  const context = canvas.getContext('2d');
  if (context !== null) {
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
  }
  return { canvas, aspect };
}
