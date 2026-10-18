import { describe, expect, it } from 'vitest';
import { decodeSvgText } from './decode.js';
import { sanitizeSvg } from './index.js';
import { hasDangerousScheme } from './model.js';
import { parseSvg } from './parse.js';

// Defence in depth hides a missing layer from the corpus tests: each layer is checked on its own.
const encode = (text: string): Uint8Array => new TextEncoder().encode(text);
const svg = (body: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">${body}</svg>`;
const codeOf = (body: string): string => {
  const result = sanitizeSvg(encode(svg(body)));
  return result.ok ? 'accepted' : result.error.code;
};

describe('dangerous URL schemes in any attribute', () => {
  it.each([
    '<rect width="1" height="1" fill="javascript:alert(1)"/>',
    '<path d="M0 0" stroke=" VBScript:x"/>',
    '<feColorMatrix values="data:text/html,x"/>',
  ])('refuses %s', (body) => {
    expect(codeOf(body)).toBe('ASSET_SVG_FORBIDDEN_CONTENT');
  });

  it('matches data: only as a scheme', () => {
    expect(hasDangerousScheme('metadata:layer')).toBe(false);
    expect(hasDangerousScheme(' data:image/png')).toBe(true);
    expect(hasDangerousScheme("url('data:x')")).toBe(true);
    expect(hasDangerousScheme('Java\tScript:')).toBe(true);
  });
});

describe('DOCTYPE and entities', () => {
  it('are refused on the bytes, before parsing', () => {
    const result = decodeSvgText(encode('<?xml version="1.0"?><!DOCTYPE svg><svg/>'));
    expect(!result.ok && result.error.code).toBe('ASSET_SVG_FORBIDDEN_CONTENT');
  });

  it('are refused by the parser as well', () => {
    const result = parseSvg('<!DOCTYPE svg><svg xmlns="http://www.w3.org/2000/svg"/>');
    expect(!result.ok && result.error.code).toBe('ASSET_SVG_FORBIDDEN_CONTENT');
  });

  it('never expands an HTML entity (strict XML entity table)', () => {
    const result = parseSvg('<svg xmlns="http://www.w3.org/2000/svg"><desc>&nbsp;</desc></svg>');
    expect(!result.ok && result.error.code).toBe('ASSET_DECODE_FAILED');
  });
});

describe('cascade and repairs', () => {
  it('lets the style attribute win over <style> rules and presentation attributes', () => {
    const result = sanitizeSvg(
      encode(
        svg('<style>rect { fill: #111111 }</style><rect fill="#222222" style="fill:#333333"/>'),
      ),
    );
    expect(result.ok && result.value.svg).toContain('fill="#333333"');
  });

  it('renames duplicate ids and keeps references on the first one', () => {
    const result = sanitizeSvg(encode(svg('<g id="a"/><g id="a"/><use href="#a"/>')));
    if (!result.ok) throw new Error(result.error.code);
    expect(result.value.svg).toContain('id="a-2"');
    expect(result.value.svg).toContain('href="#a"');
    expect(result.value.warnings.map((warning) => warning.code)).toContain('DUPLICATE_ID');
  });

  it('normalises xlink:href to href and drops editor attributes silently', () => {
    const result = sanitizeSvg(
      encode(
        '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:i="http://www.inkscape.org/namespaces/inkscape" viewBox="0 0 1 1"><g id="s" i:label="x"/><use xlink:href="#s"/></svg>',
      ),
    );
    if (!result.ok) throw new Error(result.error.code);
    expect(result.value.svg).toBe(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><g id="s"/><use href="#s"/></svg>',
    );
    expect(result.value.warnings).toEqual([]);
  });

  it('refuses complex selectors and at-rules in <style>', () => {
    expect(codeOf('<style>g > rect { fill: red }</style>')).toBe('ASSET_SVG_UNSUPPORTED_FEATURE');
    expect(codeOf('<style>@font-face { font-family: x }</style>')).toBe(
      'ASSET_SVG_UNSUPPORTED_FEATURE',
    );
  });
});

describe('value length limits', () => {
  it('bounds geometry by the file size only, every other value by 10 000 characters', () => {
    const long = ' L1 1'.repeat(4_000);
    expect(codeOf(`<path d="M0 0${long}"/>`)).toBe('accepted');
    expect(codeOf(`<polygon points="0,0${long.replace(/ L/g, ' ')}"/>`)).toBe('accepted');
    expect(codeOf(`<g transform="translate(0)${' scale(1)'.repeat(2_000)}"/>`)).toBe(
      'ASSET_SVG_TOO_COMPLEX',
    );
  });
});
