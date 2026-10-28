// A white logo on a transparent background is invisible on a white page (a JPEG export even turns it
// into a blank image). The preview picks its background from the logo's own lightness.
const OPAQUE = 128;
const LIGHT = 0.75;

const linear = (channel: number): number => {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
};

/** RGBA pixels (canvas ImageData order): mean WCAG luminance of the opaque pixels above 0.75. */
export function isLightLogo(rgba: Uint8ClampedArray): boolean {
  let sum = 0;
  let count = 0;
  for (let index = 0; index + 3 < rgba.length; index += 4) {
    if ((rgba[index + 3] ?? 0) < OPAQUE) continue;
    sum +=
      0.2126 * linear(rgba[index] ?? 0) +
      0.7152 * linear(rgba[index + 1] ?? 0) +
      0.0722 * linear(rgba[index + 2] ?? 0);
    count += 1;
  }
  return count > 0 && sum / count > LIGHT;
}
