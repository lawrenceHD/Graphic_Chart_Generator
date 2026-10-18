export interface RgbaImage {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
}

/**
 * Nearest-neighbour reduction for palette analysis (05_ENGINES.md §2.4): every output pixel is a copy of a
 * source pixel, so no blended colour can appear. Returns the input itself when it already fits.
 */
export function downscaleNearest(image: RgbaImage, maxSide = 512): RgbaImage {
  const longest = Math.max(image.width, image.height);
  if (longest <= maxSide) return image;
  const scale = maxSide / longest;
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const sourceY = Math.min(image.height - 1, Math.floor((y + 0.5) / scale));
    for (let x = 0; x < width; x += 1) {
      const sourceX = Math.min(image.width - 1, Math.floor((x + 0.5) / scale));
      const from = (sourceY * image.width + sourceX) * 4;
      data.set(image.data.subarray(from, from + 4), (y * width + x) * 4);
    }
  }
  return { width, height, data };
}
