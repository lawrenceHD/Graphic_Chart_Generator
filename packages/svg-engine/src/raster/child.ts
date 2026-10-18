// Rasterisation child process (05_ENGINES.md §3.7, SEC-15). Started by node-rasterizer.ts with a memory
// cap, the Node permission model (read-only access to its code, no write, no child process) and an empty
// environment; it is killed when it exceeds its delay. One request, one answer, then exit.
import resvg from '@resvg/resvg-js';
import type { ChildRequest, ChildResponse } from './protocol.js';

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

function answer(request: ChildRequest): ChildResponse {
  // No system fonts: sanitized SVGs contain no text, and font discovery would read the file system.
  const font = { loadSystemFonts: false };
  if (request.kind === 'bbox') {
    const box = new resvg.Resvg(request.svg, { font, logLevel: 'off' }).getBBox();
    return box
      ? { kind: 'bbox', x: box.x, y: box.y, width: box.width, height: box.height }
      : { kind: 'failure', reason: 'no visible content' };
  }
  const image = new resvg.Resvg(request.svg, {
    font,
    logLevel: 'off',
    fitTo: { mode: 'width', value: request.width },
  }).render();
  return {
    kind: 'render',
    png: new Uint8Array(image.asPng()),
    rgba: unpremultiply(new Uint8Array(image.pixels)),
    width: image.width,
    height: image.height,
  };
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
