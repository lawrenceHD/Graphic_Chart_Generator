import type { TypeStyle, VisualStyle } from '@app/contracts';
import type { FontFamily } from './catalogue.js';

// 'none' (no lettering) has no typeface to recommend.
export type TextStyle = Exclude<TypeStyle, 'none'>;

export interface TypeIntent {
  heading: TextStyle;
  body: TextStyle;
  styles: VisualStyle[];
  // Families never to propose, such as the typeface already drawn in the logo.
  avoid?: string[];
}

export interface FontChoice {
  family: string;
  score: number;
  reasons: string[];
}

export interface FontPairing {
  heading: FontChoice;
  body: FontChoice;
  score: number;
}

// Google Fonts classification tags that realise each type style, with how well they do it.
const CLASS_TAGS: Record<TypeStyle, Record<string, number>> = {
  'geometric-sans': { 'Sans/Geometric': 1, 'Sans/Rounded': 0.5 },
  'grotesque-sans': { 'Sans/Neo Grotesque': 1, 'Sans/Grotesque': 1, 'Sans/Superellipse': 0.6 },
  'humanist-sans': { 'Sans/Humanist': 1, 'Sans/Glyphic': 0.6 },
  'serif-oldstyle': { 'Serif/Old Style Garalde': 1, 'Serif/Humanist Venetian': 0.9 },
  'serif-transitional': { 'Serif/Transitional': 1, 'Serif/Scotch': 0.8 },
  didone: { 'Serif/Didone': 1, 'Serif/Modern': 0.9, 'Serif/Fat Face': 0.6 },
  slab: { 'Slab/Clarendon': 1, 'Slab/Geometric': 1, 'Slab/Humanist': 1 },
  script: {
    'Script/Formal': 1,
    'Script/Upright Script': 0.8,
    'Script/Handwritten': 0.7,
    'Script/Informal': 0.6,
  },
  display: {
    'Theme/Art Deco': 0.8,
    'Theme/Inline': 0.7,
    'Theme/Woodtype': 0.7,
    'Serif/Fat Face': 0.7,
  },
  monospace: { 'Monospace/Monospace': 1 },
  none: {},
};

// Expressive tags of Google Fonts that carry each visual style.
const STYLE_TAGS: Record<VisualStyle, string[]> = {
  minimal: ['Calm', 'Competent'],
  luxury: ['Sophisticated', 'Fancy'],
  playful: ['Playful', 'Happy', 'Cute'],
  editorial: ['Sophisticated', 'Competent'],
  organic: ['Calm', 'Sincere'],
  bold: ['Loud', 'Active'],
  retro: ['Vintage'],
  geometric: ['Futuristic', 'Innovative'],
  handcrafted: ['Artistic', 'Sincere'],
  corporate: ['Business', 'Competent'],
  tech: ['Futuristic', 'Innovative'],
  afrocentric: ['Artistic', 'Active', 'Loud'],
  warm: ['Sincere', 'Happy', 'Calm'],
  monochrome: [],
  colorful: ['Happy', 'Playful'],
  elegant: ['Sophisticated', 'Fancy'],
  industrial: ['Rugged', 'Stiff'],
  natural: ['Calm', 'Sincere'],
};

const WEIGHTS = { classification: 0.45, expressive: 0.25, quality: 0.2, popularity: 0.1 } as const;
const MAX_RANK = 2100;
const CANDIDATES = 12;
const PAIRINGS = 3;

function classification(font: FontFamily, style: TypeStyle): { value: number; reasons: string[] } {
  if (style === 'display' && font.category === 'Display') return { value: 1, reasons: ['Display'] };
  let value = 0;
  const reasons: string[] = [];
  for (const [tag, weight] of Object.entries(CLASS_TAGS[style])) {
    const strength = ((font.classes[tag] ?? 0) / 100) * weight;
    if (strength > 0) reasons.push(`${tag} ${String(font.classes[tag] ?? 0)}`);
    value = Math.max(value, strength);
  }
  return { value, reasons };
}

function expressive(
  font: FontFamily,
  styles: readonly VisualStyle[],
): { value: number; reasons: string[] } {
  const tags = [...new Set(styles.flatMap((style) => STYLE_TAGS[style]))];
  if (tags.length === 0) return { value: 0, reasons: [] };
  const matched = tags.filter((tag) => (font.expressive[tag] ?? 0) >= 50);
  const value = tags.reduce((sum, tag) => sum + (font.expressive[tag] ?? 0) / 100, 0) / tags.length;
  return { value, reasons: matched.map((tag) => `${tag} ${String(font.expressive[tag] ?? 0)}`) };
}

function canSetText(font: FontFamily): boolean {
  return (
    (font.category === 'Sans Serif' ||
      font.category === 'Serif' ||
      font.category === 'Monospace') &&
    font.weights.includes(400) &&
    font.weights.includes(700)
  );
}

function rate(font: FontFamily, style: TypeStyle, styles: readonly VisualStyle[]): FontChoice {
  const kind = classification(font, style);
  const mood = expressive(font, styles);
  const popularity = 1 - Math.log(Math.min(font.popularity, MAX_RANK)) / Math.log(MAX_RANK);
  const score =
    WEIGHTS.classification * kind.value +
    WEIGHTS.expressive * mood.value +
    WEIGHTS.quality * (font.quality / 100) +
    WEIGHTS.popularity * popularity;
  return {
    family: font.family,
    score: Math.round(score * 1000) / 1000,
    reasons: [...kind.reasons, ...mood.reasons, `quality ${String(font.quality)}`],
  };
}

function shortlist(
  catalogue: readonly FontFamily[],
  style: TypeStyle,
  styles: readonly VisualStyle[],
  accept: (font: FontFamily) => boolean,
): FontChoice[] {
  return catalogue
    .filter((font) => accept(font) && classification(font, style).value >= 0.5)
    .map((font) => rate(font, style, styles))
    .sort((a, b) => b.score - a.score || a.family.localeCompare(b.family))
    .slice(0, CANDIDATES);
}

const STYLE_WORDS =
  /\b(thin|hairline|extra ?light|ultra ?light|light|book|regular|normal|medium|semi ?bold|demi ?bold|bold|extra ?bold|ultra ?bold|black|heavy|italic|oblique|condensed)\b/gu;

// "MONTSERRAT Bold" and "Montserrat" name the same family.
function familyKey(name: string): string {
  return name.toLowerCase().replace(STYLE_WORDS, ' ').replace(/\s+/gu, ' ').trim();
}

// Two families of one superfamily (IBM Plex Sans + IBM Plex Serif) are designed to work together.
function sameSuperfamily(a: string, b: string): boolean {
  const [first] = a.split(' ');
  return a !== b && first !== undefined && first.length > 2 && b.startsWith(`${first} `);
}

export function recommendPairings(
  intent: TypeIntent,
  catalogue: readonly FontFamily[],
): FontPairing[] {
  const avoid = new Set((intent.avoid ?? []).map(familyKey));
  const allowed = (font: FontFamily): boolean => !avoid.has(familyKey(font.family));
  const headings = shortlist(catalogue, intent.heading, intent.styles, allowed);
  const bodies = shortlist(
    catalogue,
    intent.body,
    intent.styles,
    (font) => allowed(font) && canSetText(font),
  );
  // Same style for both roles: a designer sets one family in several weights rather than two look-alikes.
  const singleFamily = intent.heading === intent.body;
  const pairings: FontPairing[] = [];
  for (const heading of headings) {
    for (const body of bodies) {
      if ((heading.family === body.family) !== singleFamily) continue;
      const bonus = sameSuperfamily(heading.family, body.family) ? 0.05 : 0;
      pairings.push({
        heading,
        body,
        score: Math.round((heading.score + body.score + bonus) * 1000) / 1000,
      });
    }
  }
  pairings.sort((a, b) => b.score - a.score || a.heading.family.localeCompare(b.heading.family));
  const result: FontPairing[] = [];
  const usedHeadings = new Set<string>();
  const usedBodies = new Set<string>();
  for (const pairing of pairings) {
    const { family: head } = pairing.heading;
    const { family: text } = pairing.body;
    // A face appears in one proposal only, whatever its role, so the options really differ.
    if (
      singleFamily
        ? usedHeadings.has(head)
        : [head, text].some((f) => usedHeadings.has(f) || usedBodies.has(f))
    ) {
      continue;
    }
    usedHeadings.add(head);
    usedBodies.add(text);
    result.push(pairing);
    if (result.length === PAIRINGS) break;
  }
  return result;
}
