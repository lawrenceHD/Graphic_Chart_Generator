import { useCallback, useEffect, useState } from 'react';
import type { Brand, Role } from './brand';

export interface Palette {
  primary: string;
  accent: string;
  dark: string;
  light: string;
}
export type PaletteKey = keyof Palette;
export const PALETTE_ROLE: Record<PaletteKey, Role> = {
  primary: 'primary',
  accent: 'accent',
  dark: 'neutralDark',
  light: 'neutralLight',
};

export const paletteOf = (brand: Brand): Palette => ({
  primary: brand.roles.primary.hex,
  accent: brand.roles.accent.hex,
  dark: brand.roles.neutralDark.hex,
  light: brand.roles.neutralLight.hex,
});

/** The brand palette with the inspector's edits; reset when the brand changes. */
export function useBrandPalette(brand: Brand) {
  const [palette, setPalette] = useState<Palette>(() => paletteOf(brand));
  useEffect(() => {
    setPalette(paletteOf(brand));
  }, [brand]);
  const set = useCallback(
    (key: PaletteKey, hex: string) => setPalette((current) => ({ ...current, [key]: hex })),
    [],
  );
  const reset = useCallback(() => setPalette(paletteOf(brand)), [brand]);
  return { palette, set, reset };
}
