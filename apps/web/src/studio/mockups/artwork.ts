import { contrastRatio } from '../../brand/color';
import type { BrandView } from '../workspace/brand-view';

// The brand's artwork for each printed object of a mockup, drawn the way a designer lays out collateral:
// a business card front on the primary colour with the reversed logo, a back with the contact block, a
// letterhead with its logo top left and a coloured foot, a poster on a brand field with a headline in the
// display face. Texts come from the brand (name, mission, tone); contact lines are labelled placeholders.
// The logo files are drawn as they are, never redrawn.

export type ArtworkRole =
  'card-front' | 'card-back' | 'letter' | 'poster' | 'mug-logo' | 'cup-logo';

export interface ArtworkWords {
  readonly name: string;
  readonly title: string;
  readonly phone: string;
  readonly email: string;
  readonly address: string;
  readonly dear: string;
}

type Ctx = CanvasRenderingContext2D;
type Logos = Readonly<{
  color: HTMLImageElement;
  white: HTMLImageElement;
  black: HTMLImageElement;
}>;

const LONG_SIDE = 2048;
const REVERSED_MIN = 2.2;

function loadImage(src: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.decoding = 'async';
  image.crossOrigin = 'anonymous';
  image.src = src;
  return image.decode().then(() => image);
}

export async function loadLogos(view: BrandView): Promise<Logos> {
  const color = await loadImage(view.logo.vector ?? view.logo.color);
  const [white, black] = await Promise.all([
    view.logo['mono-white'] === null ? color : loadImage(view.logo['mono-white']),
    view.logo['mono-black'] === null ? color : loadImage(view.logo['mono-black']),
  ]);
  return { color, white, black };
}

/** The logo version that reads on a background: colour on light stock, else white or black. */
export function logoFor(view: BrandView, background: string): 'color' | 'white' | 'black' {
  if (contrastRatio(background, '#FFFFFF') < 1.25) return 'color';
  if (contrastRatio(background, view.colors.neutralLight) < 1.2) return 'color';
  // On a large brand field a designer reverses the mark out in white as soon as it holds (2.2:1, a mark
  // read at size, not body text); black only on light or bright fields.
  return contrastRatio('#FFFFFF', background) >= REVERSED_MIN ? 'white' : 'black';
}

/** Readable ink for text on a background. */
function inkOn(view: BrandView, background: string): string {
  const dark = view.colors.neutralDark;
  if (contrastRatio(dark, background) >= 4.5) return dark;
  return contrastRatio('#FFFFFF', background) >= contrastRatio('#111111', background)
    ? '#FFFFFF'
    : '#111111';
}

/** Draws the image inside the box (contain), aligned as asked; returns the drawn rectangle. */
function drawContained(
  ctx: Ctx,
  image: HTMLImageElement,
  box: { x: number; y: number; w: number; h: number },
  align: 'center' | 'left' = 'center',
): { x: number; y: number; w: number; h: number } {
  const aspect = image.naturalWidth / Math.max(1, image.naturalHeight);
  const w = Math.min(box.w, box.h * aspect);
  const h = w / aspect;
  const x = align === 'left' ? box.x : box.x + (box.w - w) / 2;
  const y = box.y + (box.h - h) / 2;
  ctx.drawImage(image, x, y, w, h);
  return { x, y, w, h };
}

function wrap(ctx: Ctx, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/u).filter((word) => word !== '');
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line === '' ? word : `${line} ${word}`;
    if (ctx.measureText(next).width > maxWidth && line !== '') {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line !== '') lines.push(line);
  return lines;
}

const font = (weight: number, size: number, family: string) =>
  `${String(weight)} ${String(Math.round(size))}px ${family}`;

async function fontsReady(view: BrandView): Promise<void> {
  await Promise.all([
    document.fonts.load(font(700, 40, view.pairing.display.css)),
    document.fonts.load(font(400, 40, view.pairing.text.css)),
    document.fonts.load(font(600, 40, view.pairing.text.css)),
  ]).catch(() => undefined);
}

function cardFront(ctx: Ctx, w: number, h: number, view: BrandView, logos: Logos) {
  const field = view.colors.primary;
  ctx.fillStyle = field;
  ctx.fillRect(0, 0, w, h);
  const logo = logos[logoFor(view, field)];
  drawContained(ctx, logo, { x: w * 0.24, y: h * 0.26, w: w * 0.52, h: h * 0.48 });
}

function cardBack(
  ctx: Ctx,
  w: number,
  h: number,
  view: BrandView,
  logos: Logos,
  words: ArtworkWords,
) {
  const paper = view.colors.neutralLight;
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, w, h);
  const ink = inkOn(view, paper);
  const m = w * 0.09;
  ctx.fillStyle = ink;
  ctx.textBaseline = 'alphabetic';
  ctx.font = font(700, h * 0.085, view.pairing.display.css);
  ctx.fillText(words.name, m, h * 0.36);
  ctx.globalAlpha = 0.72;
  ctx.font = font(400, h * 0.05, view.pairing.text.css);
  ctx.fillText(words.title, m, h * 0.45);
  ctx.globalAlpha = 1;
  ctx.fillStyle = contrastRatio(view.colors.primary, paper) >= 2 ? view.colors.primary : ink;
  ctx.fillRect(m, h * 0.53, w * 0.07, h * 0.012);
  ctx.fillStyle = ink;
  ctx.font = font(400, h * 0.043, view.pairing.text.css);
  [words.phone, words.email, words.address].forEach((line, index) => {
    ctx.fillText(line, m, h * (0.65 + index * 0.075));
  });
  drawContained(ctx, logos[logoFor(view, paper)], {
    x: w * 0.6,
    y: h * 0.62,
    w: w * 0.31,
    h: h * 0.24,
  });
}

function letter(
  ctx: Ctx,
  w: number,
  h: number,
  view: BrandView,
  logos: Logos,
  words: ArtworkWords,
) {
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, w, h);
  const m = w * 0.1;
  const ink = inkOn(view, '#FFFFFF');
  drawContained(ctx, logos.color, { x: m, y: h * 0.05, w: w * 0.34, h: h * 0.075 }, 'left');
  ctx.fillStyle = ink;
  ctx.globalAlpha = 0.65;
  ctx.font = font(400, w * 0.017, view.pairing.text.css);
  ctx.textAlign = 'right';
  [words.address, words.phone, words.email].forEach((line, index) => {
    ctx.fillText(line, w - m, h * (0.07 + index * 0.022));
  });
  ctx.textAlign = 'left';
  ctx.globalAlpha = 1;
  ctx.font = font(600, w * 0.021, view.pairing.text.css);
  ctx.fillText(words.dear, m, h * 0.24);
  ctx.font = font(400, w * 0.019, view.pairing.text.css);
  ctx.globalAlpha = 0.85;
  const body = [view.mission, view.vision, ...view.values.map((value) => value.description)]
    .filter((text) => text.trim() !== '')
    .join(' ');
  const lines = wrap(ctx, body, w - 2 * m).slice(0, 16);
  lines.forEach((line, index) => {
    ctx.fillText(line, m, h * 0.285 + index * w * 0.032);
  });
  ctx.globalAlpha = 1;
  ctx.font = font(700, w * 0.024, view.pairing.display.css);
  ctx.fillText(words.name, m, h * 0.285 + (lines.length + 1.6) * w * 0.032);
  // Foot: a band of the primary colour, as letterheads of the reference guidelines do.
  ctx.fillStyle = view.colors.primary;
  ctx.fillRect(0, h * 0.955, w, h * 0.045);
  ctx.fillStyle = view.colors.accent;
  ctx.fillRect(0, h * 0.948, w * 0.32, h * 0.007);
}

function poster(ctx: Ctx, w: number, h: number, view: BrandView, logos: Logos) {
  const field =
    contrastRatio('#FFFFFF', view.colors.primary) >= 2
      ? view.colors.primary
      : view.colors.neutralDark;
  ctx.fillStyle = field;
  ctx.fillRect(0, 0, w, h);
  const ink = inkOn(view, field) === '#111111' ? '#111111' : '#FFFFFF';
  const m = w * 0.1;
  drawContained(
    ctx,
    logos[logoFor(view, field)],
    { x: m, y: h * 0.07, w: w * 0.5, h: h * 0.1 },
    'left',
  );
  const headline = view.tone.examples.find((line) => line.trim() !== '') ?? view.name;
  ctx.fillStyle = ink;
  ctx.font = font(700, w * 0.095, view.pairing.display.css);
  const lines = wrap(ctx, headline, w - 2 * m).slice(0, 5);
  const lineHeight = w * 0.1;
  const top = h * 0.88 - lines.length * lineHeight;
  lines.forEach((line, index) => {
    ctx.fillText(line, m, top + (index + 1) * lineHeight);
  });
  ctx.fillStyle = view.colors.accent;
  ctx.fillRect(m, h * 0.92, w * 0.12, h * 0.006);
  ctx.fillStyle = ink;
  ctx.globalAlpha = 0.8;
  ctx.font = font(600, w * 0.028, view.pairing.text.css);
  ctx.fillText(view.name, m, h * 0.955);
  ctx.globalAlpha = 1;
}

function logoOnly(ctx: Ctx, w: number, h: number, logos: Logos) {
  ctx.clearRect(0, 0, w, h);
  drawContained(ctx, logos.color, { x: w * 0.1, y: h * 0.1, w: w * 0.8, h: h * 0.8 });
}

/** Draws the artwork of a role at the slot's proportions (width / height). */
export async function drawArtwork(
  role: string,
  aspect: number,
  view: BrandView,
  logos: Logos,
  words: ArtworkWords,
): Promise<HTMLCanvasElement> {
  await fontsReady(view);
  const canvas = document.createElement('canvas');
  canvas.width = aspect >= 1 ? LONG_SIDE : Math.round(LONG_SIDE * aspect);
  canvas.height = aspect >= 1 ? Math.round(LONG_SIDE / aspect) : LONG_SIDE;
  const ctx = canvas.getContext('2d');
  if (ctx === null) return canvas;
  const { width: w, height: h } = canvas;
  if (role === 'card-front') cardFront(ctx, w, h, view, logos);
  else if (role === 'card-back') cardBack(ctx, w, h, view, logos, words);
  else if (role === 'letter') letter(ctx, w, h, view, logos, words);
  else if (role === 'poster') poster(ctx, w, h, view, logos);
  else logoOnly(ctx, w, h, logos);
  return canvas;
}
