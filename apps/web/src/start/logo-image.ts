import { isLightLogo } from './logo-tone';

// Browser-only helpers around a chosen logo file: its tone for the preview background, and the
// conversion of an SVG with live text into a high-definition PNG drawn with this computer's fonts.
const RASTER_LONG_SIDE = 2048;
const TONE_SIDE = 64;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      resolve(image);
    };
    image.onerror = () => {
      reject(new Error('image could not be decoded'));
    };
    image.src = url;
  });
}

/** Intrinsic ratio, from the viewBox when the SVG declares no size. */
function ratioOf(image: HTMLImageElement, svg: string | null): number {
  if (image.naturalWidth > 0 && image.naturalHeight > 0)
    return image.naturalWidth / image.naturalHeight;
  const box = svg?.match(/viewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
  const width = Number(box?.[1]);
  const height = Number(box?.[2]);
  return width > 0 && height > 0 ? width / height : 1;
}

function canvasOf(width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const context = canvas.getContext('2d');
  if (context === null) throw new Error('canvas unavailable');
  return { canvas, context };
}

export async function isLightLogoFile(file: File): Promise<boolean> {
  const url = URL.createObjectURL(file);
  try {
    const image = await loadImage(url);
    const ratio = ratioOf(image, null);
    const { context } = canvasOf(
      TONE_SIDE * Math.min(1, ratio),
      TONE_SIDE * Math.min(1, 1 / ratio),
    );
    context.drawImage(image, 0, 0, context.canvas.width, context.canvas.height);
    return isLightLogo(
      context.getImageData(0, 0, context.canvas.width, context.canvas.height).data,
    );
  } catch {
    return false; // unreadable here: the server scan gives the verdict
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function rasterizeSvg(file: File, svg: string): Promise<File> {
  const url = URL.createObjectURL(file);
  try {
    const image = await loadImage(url);
    const ratio = ratioOf(image, svg);
    const width = ratio >= 1 ? RASTER_LONG_SIDE : RASTER_LONG_SIDE * ratio;
    const height = ratio >= 1 ? RASTER_LONG_SIDE / ratio : RASTER_LONG_SIDE;
    const { canvas, context } = canvasOf(width, height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/png');
    });
    if (blob === null) throw new Error('PNG encoding failed');
    return new File([blob], `${file.name.replace(/\.svg$/i, '')}.png`, { type: 'image/png' });
  } finally {
    URL.revokeObjectURL(url);
  }
}

const PROBE = 'mmmmmmmmmmlliWMèQ@#';
const FALLBACKS = ['monospace', 'serif', 'sans-serif'] as const;

/**
 * Fonts not installed on this computer: drawn with each generic family as fallback, a missing font
 * leaves every width unchanged (classic canvas probe; document.fonts does not see local fonts).
 */
export function missingFonts(fonts: readonly string[]): string[] {
  const context = document.createElement('canvas').getContext('2d');
  if (context === null) return [...fonts];
  const width = (family: string): number => {
    context.font = `72px ${family}`;
    return context.measureText(PROBE).width;
  };
  return fonts.filter((font) => {
    const quoted = `"${font.replace(/["\\]/g, '')}"`;
    return FALLBACKS.every((generic) => width(`${quoted}, ${generic}`) === width(generic));
  });
}
