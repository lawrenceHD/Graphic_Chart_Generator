// Rasterisation child process (05_ENGINES.md §3.7, SEC-15). Started by node-rasterizer.ts with a memory
// cap, the Node permission model (read-only access to its code, no write, no child process) and an empty
// environment; it is killed when it exceeds its delay. One request, one answer, then exit.
// Self-contained on purpose: run directly from TypeScript in tests, it may only `import type` locally.
import { crc32, deflateSync } from 'node:zlib';
import resvg, { type ResvgRenderOptions } from '@resvg/resvg-js';
import type { ChildRequest, ChildResponse } from './protocol.js';

// No system fonts: sanitized SVGs contain no text, and font discovery would read the file system.
const OPTIONS: ResvgRenderOptions = { font: { loadSystemFonts: false }, logLevel: 'off' };
// Largest extended canvas (pixels) of the off-canvas workaround below: 64 MB of RGBA.
const MAX_CANVAS = 16_777_216;

function isRequest(value: unknown): value is ChildRequest {
  if (typeof value !== 'object' || value === null) return false;
  const kind: unknown = Reflect.get(value, 'kind');
  const svg: unknown = Reflect.get(value, 'svg');
  const width: unknown = Reflect.get(value, 'width');
  return (
    typeof svg === 'string' && (kind === 'bbox' || (kind === 'render' && typeof width === 'number'))
  );
}

// resvg returns premultiplied RGBA; the port promises straight alpha, otherwise a white anti-aliased edge
// reads as grey (dark) in ink masks.
function unpremultiply(pixels: Uint8Array): Uint8Array {
  const straight = new Uint8Array(pixels);
  for (let offset = 0; offset < straight.length; offset += 4) {
    const alpha = straight[offset + 3] ?? 0;
    if (alpha === 0 || alpha === 255) continue;
    for (let channel = 0; channel < 3; channel += 1) {
      straight[offset + channel] = Math.min(
        255,
        Math.round(((straight[offset + channel] ?? 0) * 255) / alpha),
      );
    }
  }
  return straight;
}

function chunk(type: string, data: Uint8Array): Buffer {
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const frame = Buffer.alloc(body.length + 8);
  frame.writeUInt32BE(data.length, 0);
  body.copy(frame, 4);
  frame.writeUInt32BE(crc32(body), body.length + 4);
  return frame;
}

/** 8-bit RGBA PNG of straight-alpha pixels, no filter. */
function encodePng(straight: Uint8Array, width: number, height: number): Uint8Array {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 6, 0, 0, 0], 8);
  const rows = Buffer.alloc((width * 4 + 1) * height);
  for (let row = 0; row < height; row += 1) {
    rows.set(straight.subarray(row * width * 4, (row + 1) * width * 4), row * (width * 4 + 1) + 1);
  }
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return new Uint8Array(
    Buffer.concat([
      signature,
      chunk('IHDR', header),
      chunk('IDAT', deflateSync(rows)),
      chunk('IEND', new Uint8Array(0)),
    ]),
  );
}

// How resvg maps the viewBox onto a `width`-pixel image (sanitizeSvg leaves the root a viewBox and no
// size): it rounds the fitted height and stretches each axis on its own, with no centring.
interface Fit {
  readonly height: number;
  readonly scaleX: number;
  readonly scaleY: number;
}

function fit([, , w = 1, h = 1]: readonly number[], width: number): Fit {
  const height = Math.round((h * width) / w);
  return { height, scaleX: width / w, scaleY: height / h };
}

interface Margins {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

// Whole-pixel margins from the image out to the content's bounding box; 'inside' when the content stays
// inside, 'too-large' when reaching it would exceed MAX_CANVAS.
function overflow(
  svg: string,
  viewBox: readonly number[],
  width: number,
  place: Fit,
): Margins | 'inside' | 'too-large' {
  const [x = 0, y = 0] = viewBox;
  const box = new resvg.Resvg(svg, OPTIONS).getBBox();
  if (box === undefined) return 'inside';
  const left = Math.ceil(Math.max(0, (x - box.x) * place.scaleX));
  const top = Math.ceil(Math.max(0, (y - box.y) * place.scaleY));
  const right = Math.ceil(Math.max(0, (box.x + box.width - x) * place.scaleX - width));
  const bottom = Math.ceil(Math.max(0, (box.y + box.height - y) * place.scaleY - place.height));
  if (left + top + right + bottom === 0) return 'inside';
  const area = (width + left + right) * (place.height + top + bottom);
  return area <= MAX_CANVAS ? { left, top, right, bottom } : 'too-large';
}

// Tags of the canonical sanitizeSvg output: no comment, no CDATA, attribute values escape <, > and ".
const TAG = /<(\/?)([A-Za-z][\w:.-]*)([^<>]*?)(\/?)>/g;
// Content of these elements is not drawn where it stands.
const NOT_RENDERED = new Set([
  'defs',
  'clipPath',
  'mask',
  'pattern',
  'symbol',
  'marker',
  'linearGradient',
  'radialGradient',
  'filter',
]);
const ISOLATION = /\s(?:clip-path|mask|opacity)="[^"]*"/g;

interface Candidate {
  readonly start: number;
  readonly end: number;
  readonly ancestors: readonly string[];
}

/**
 * Drops the clipped, masked, translucent or use elements whose content lies wholly outside the viewBox: they
 * paint no pixel, but resvg 2.6.2 panics on them when the canvas cannot be widened up to them. Elements
 * with a filter are kept (a blur may bleed into the canvas), as is anything resvg cannot measure.
 */
function withoutOffCanvasGroups(svg: string, viewBox: readonly number[]): string {
  const [x = 0, y = 0, w = 0, h = 0] = viewBox;
  // Strokes are not in the bounding box: keep what comes within 5 % of the canvas
  const slack = Math.max(w, h) * 0.05;
  const rootOpen = /^<svg [^>]*>/.exec(svg)?.[0];
  if (rootOpen === undefined) return svg;
  const stack: { name: string; open: string; start: number; hidden: boolean }[] = [];
  const definitions: string[] = [];
  const candidates: Candidate[] = [];
  for (const match of svg.matchAll(TAG)) {
    const [tag, closing, name = '', , selfClosing] = match;
    const start = match.index;
    if (closing === '/') {
      const element = stack.pop();
      if (element === undefined) return svg;
      const end = start + tag.length;
      if (element.name === 'defs' && !stack.some((parent) => parent.hidden)) {
        definitions.push(svg.slice(element.start, end));
      }
      if (!element.hidden && stack.length > 0 && isCandidate(element.open)) {
        const slice = svg.slice(element.start, end);
        if (!slice.includes(' filter="')) {
          candidates.push({
            start: element.start,
            end,
            ancestors: stack.slice(1).map((e) => e.open),
          });
        }
      }
      continue;
    }
    const hidden = NOT_RENDERED.has(name) || stack.some((parent) => parent.hidden);
    if (selfClosing === '/') {
      if (!hidden && stack.length > 0 && isCandidate(tag) && !tag.includes(' filter="')) {
        candidates.push({
          start,
          end: start + tag.length,
          ancestors: stack.slice(1).map((e) => e.open),
        });
      }
      continue;
    }
    stack.push({ name, open: tag, start, hidden });
  }

  const dropped: Candidate[] = [];
  for (const candidate of candidates.sort((a, b) => a.start - b.start)) {
    if (dropped.some((outer) => candidate.start >= outer.start && candidate.end <= outer.end))
      continue;
    const element = svg
      .slice(candidate.start, candidate.end)
      .replace(/^<[^>]*>/, (open) => open.replace(ISOLATION, ''));
    const opens = candidate.ancestors.map((open) => open.replace(ISOLATION, ''));
    const closes = candidate.ancestors
      .map((open) => `</${/^<([\w:.-]+)/.exec(open)?.[1] ?? 'g'}>`)
      .reverse();
    const alone = `${rootOpen}${definitions.join('')}${opens.join('')}${element}${closes.join('')}</svg>`;
    let box: { x: number; y: number; width: number; height: number } | undefined;
    try {
      box = new resvg.Resvg(alone, OPTIONS).getBBox();
    } catch {
      continue;
    }
    const outside =
      box === undefined ||
      box.x > x + w + slack ||
      box.y > y + h + slack ||
      box.x + box.width < x - slack ||
      box.y + box.height < y - slack;
    if (outside) dropped.push(candidate);
  }
  let pruned = svg;
  for (const { start, end } of dropped.sort((a, b) => b.start - a.start)) {
    pruned = pruned.slice(0, start) + pruned.slice(end);
  }
  return pruned;
}

// Isolated groups, and use elements: resvg renders each one as a group of its own.
function isCandidate(open: string): boolean {
  return (
    open.startsWith('<use ') || / (?:clip-path|mask)="/.test(open) || / opacity="(?!1")/.test(open)
  );
}

// resvg 2.6.2 panics (geom.rs:27, the child dies) when a clipped, masked or translucent group has all its
// content off the canvas, as PDF exports often do. Render on a canvas widened by whole pixels up to that
// content, with the same scales and pixel grid, then cut the image back out: the pixels of a plain render.
// When even that canvas would be too large (a whole PDF page around the logo), the groups lying wholly
// outside are dropped first: they paint nothing.
function render(original: string, width: number): ChildResponse {
  const viewBox = /^<svg [^>]*viewBox="([^"]+)"/.exec(original)?.[1]?.split(' ').map(Number) ?? [];
  const place = fit(viewBox, width);
  let svg = original;
  let margins = viewBox.length === 4 ? overflow(svg, viewBox, width, place) : 'inside';
  if (margins === 'too-large') {
    svg = withoutOffCanvasGroups(svg, viewBox);
    margins = overflow(svg, viewBox, width, place);
  }
  if (typeof margins === 'string') {
    const image = new resvg.Resvg(svg, {
      ...OPTIONS,
      fitTo: { mode: 'width', value: width },
    }).render();
    return {
      kind: 'render',
      png: new Uint8Array(image.asPng()),
      rgba: unpremultiply(new Uint8Array(image.pixels)),
      width: image.width,
      height: image.height,
    };
  }
  const [x = 0, y = 0] = viewBox;
  const { left, top, right, bottom } = margins;
  const { height, scaleX, scaleY } = place;
  const canvasWidth = width + left + right;
  const canvasHeight = height + top + bottom;
  const canvas = [x - left / scaleX, y - top / scaleY, canvasWidth / scaleX, canvasHeight / scaleY];
  const widened = svg.replace(/^<svg [^>]*>/, (root) =>
    root
      .replace(/ preserveAspectRatio="[^"]*"/, '')
      .replace(
        /viewBox="[^"]+"/,
        `viewBox="${canvas.map(String).join(' ')}" width="${String(canvasWidth)}" height="${String(canvasHeight)}" preserveAspectRatio="none"`,
      ),
  );
  const image = new resvg.Resvg(widened, OPTIONS).render();
  const pixels = new Uint8Array(image.pixels);
  const cut = new Uint8Array(width * height * 4);
  for (let row = 0; row < height; row += 1) {
    const start = ((row + top) * image.width + left) * 4;
    cut.set(pixels.subarray(start, start + width * 4), row * width * 4);
  }
  const rgba = unpremultiply(cut);
  return { kind: 'render', png: encodePng(rgba, width, height), rgba, width, height };
}

function answer(request: ChildRequest): ChildResponse {
  if (request.kind === 'render') return render(request.svg, request.width);
  const box = new resvg.Resvg(request.svg, OPTIONS).getBBox();
  return box
    ? { kind: 'bbox', x: box.x, y: box.y, width: box.width, height: box.height }
    : { kind: 'failure', reason: 'no visible content' };
}

process.once('message', (message: unknown) => {
  let response: ChildResponse;
  try {
    response = isRequest(message)
      ? answer(message)
      : { kind: 'failure', reason: 'invalid request' };
  } catch {
    // resvg throws on SVG it cannot parse: report it, never its content.
    response = { kind: 'failure', reason: 'resvg failed' };
  }
  process.send?.(response, () => process.exit(0));
});
