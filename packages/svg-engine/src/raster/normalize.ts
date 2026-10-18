import type { RasterError, RasterImage } from '@app/contracts';
import { err, ok, type Result } from '@app/kernel';
import sharp from 'sharp';
import { detectType } from '../detect/detect-type.js';

// 01_PRODUCT_MVP.md §3 and 05_ENGINES.md §4.
const MAX_BYTES = 10 * 1024 * 1024;
const MAX_SIDE = 8192;
const LIMIT_INPUT_PIXELS = 67_108_864;

/** Decodes an uploaded raster under pixel limits, applies EXIF orientation, strips metadata, outputs RGBA PNG. */
export async function normalizeRaster(
  bytes: Uint8Array,
): Promise<Result<RasterImage, RasterError>> {
  const type = detectType(bytes);
  if (type !== 'png' && type !== 'jpeg' && type !== 'webp') {
    return err({ code: 'ASSET_TYPE_UNSUPPORTED', reason: `not a raster (${type})` });
  }
  if (bytes.length > MAX_BYTES) return err({ code: 'ASSET_TOO_LARGE', reason: 'file over 10 MB' });
  try {
    // failOn 'warning' (sharp default kept explicit): a truncated or corrupt file is refused, not patched.
    const image = sharp(bytes, { limitInputPixels: LIMIT_INPUT_PIXELS, failOn: 'warning' });
    const { width, height } = await image.metadata();
    if (width > MAX_SIDE || height > MAX_SIDE) {
      return err({ code: 'ASSET_TOO_LARGE', reason: 'dimensions over 8192 px' });
    }
    // rotate() without angle applies the EXIF orientation; sharp writes no metadata unless asked to.
    const { data, info } = await image
      .rotate()
      .ensureAlpha()
      .png()
      .toBuffer({ resolveWithObject: true });
    return ok({ png: new Uint8Array(data), width: info.width, height: info.height });
  } catch {
    // sharp rejects with an Error for undecodable input; its message may echo internals, so it is dropped.
    return err({ code: 'ASSET_DECODE_FAILED', reason: 'raster could not be decoded' });
  }
}
