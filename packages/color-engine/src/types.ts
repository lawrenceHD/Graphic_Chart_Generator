/** An sRGB channel encoded as an 8-bit integer. */
export type Channel = number;

/** A color in 8-bit sRGB. */
export interface Rgb {
  readonly r: Channel;
  readonly g: Channel;
  readonly b: Channel;
}

/** Perceptual OKLab coordinates. */
export interface Oklab {
  readonly L: number;
  readonly a: number;
  readonly b: number;
}

/** OKLCH coordinates; hue in degrees in [0, 360), null for achromatic colors (ADR-021). */
export interface Oklch {
  readonly L: number;
  readonly C: number;
  readonly h: number | null;
}

/** CIELAB coordinates under the D65 illuminant. */
export interface Lab {
  readonly L: number;
  readonly a: number;
  readonly b: number;
}
