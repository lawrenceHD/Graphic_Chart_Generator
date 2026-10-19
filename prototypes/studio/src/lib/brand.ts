import brandsJson from '../data/brands.json';
import wallJson from '../data/wall.json';

// Shape of src/data/*.json, written by scripts/build-brands.mjs from the real engines.
export type Role = 'primary' | 'accent' | 'neutralDark' | 'neutralLight';
export interface ColorInfo {
  hex: string;
  rgb: number[];
  oklch: number[];
  cmyk: number[];
  source?: string;
}
export interface Brand {
  slug: string;
  name: string;
  sector: string;
  brief: string;
  fonts: { display: string; text: string };
  logo: string;
  bbox: { x: number; y: number; width: number; height: number };
  extracted: { hex: string; share: number }[];
  roles: Record<Role, ColorInfo>;
  extra: ColorInfo[];
  scales: { primary: { step: number; hex: string }[]; accent: { step: number; hex: string }[] };
  contrast: { text: string; background: string; ratio: number; level: string }[];
  mono: {
    black: string;
    white: string;
    tonal: string;
    path: string;
    separated: boolean;
    structure: number | null;
  };
  clearSpace: string;
  favicon: string;
  donts: { kind: string; svg: string }[];
}
export interface WallLogo {
  name: string;
  svg: string;
  colors: string[];
  industry: string;
  dark: boolean;
}

export const BRANDS: Brand[] = brandsJson;
export const WALL: WallLogo[] = wallJson;
export const ROLE_LABEL: Record<Role, string> = {
  primary: 'Principale',
  accent: 'Accent',
  neutralDark: 'Neutre sombre',
  neutralLight: 'Neutre clair',
};

/** SVGs are only ever shown as images, never inlined (04_API_CONTRACTS.md §6). */
export const svgUrl = (svg: string): string =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

export function brandBySlug(slug: string | undefined): Brand {
  return BRANDS.find((brand) => brand.slug === slug) ?? BRANDS[0]!;
}
