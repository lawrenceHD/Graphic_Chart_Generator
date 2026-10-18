import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import cases from '../../fixtures/attacks/cases.json' with { type: 'json' };
import { sanitizeSvg } from './index.js';

const attacks = import.meta.glob<string>('../../fixtures/attacks/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
});
const legit = Object.entries(
  import.meta.glob<string>('../../fixtures/legit/*.svg', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
);
const encode = (text: string): Uint8Array => new TextEncoder().encode(text);
const OPEN = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">';

// Cases too large to commit (docs/10_QUALITY.md §6, cases 21, 22, 24, 25).
const generated: Record<string, () => string> = {
  'deep-nesting': () => `${OPEN}${'<g>'.repeat(10_000)}${'</g>'.repeat(10_000)}</svg>`,
  'node-count': () => `${OPEN}${'<rect/>'.repeat(500_000)}</svg>`,
  'use-expansion-bomb': () => {
    // Six levels of 20 references: 20^6 = 64 million nodes once expanded, depth stays within 8.
    let defs = '<g id="l0"><rect width="1" height="1"/></g>';
    for (let level = 1; level <= 6; level += 1) {
      defs += `<g id="l${String(level)}">${`<use href="#l${String(level - 1)}"/>`.repeat(20)}</g>`;
    }
    return `${OPEN}<defs>${defs}</defs><use href="#l6"/></svg>`;
  },
  'huge-attribute-value': () => `${OPEN}<path d="M0 0${' L1 1'.repeat(2_000_000)}"/></svg>`,
};

function inputOf(entry: (typeof cases)[number]): string {
  if ('file' in entry) {
    const content = attacks[`../../fixtures/attacks/${entry.file}`];
    if (content === undefined) throw new Error(`missing fixture ${entry.file}`);
    return content;
  }
  const generate = generated[entry.generator];
  if (!generate) throw new Error(`missing generator ${entry.generator}`);
  return generate();
}

const SHAPE = /<(path|rect|circle|ellipse|line|polyline|polygon)\b/g;
const shapeCount = (svg: string): number => svg.match(SHAPE)?.length ?? 0;

describe('sanitizeSvg — attack corpus (docs/10_QUALITY.md §6)', () => {
  it('covers the 30 cases', () => {
    expect(cases.map((entry) => entry.id)).toEqual(
      Array.from({ length: 30 }, (_, index) => index + 1),
    );
  });

  it.each(cases)('case $id', (entry) => {
    const result = sanitizeSvg(encode(inputOf(entry)));
    const expected = entry.expected;
    if (!expected.ok) {
      expect(result.ok ? 'accepted' : result.error.code).toBe(expected.code);
      if ('hint' in expected && !result.ok) expect(result.error.hint).toBe(expected.hint);
      return;
    }
    if (!result.ok) throw new Error(`refused: ${result.error.code} ${result.error.reason}`);
    for (const pattern of 'absent' in expected ? expected.absent : []) {
      expect(result.value.svg.toLowerCase()).not.toContain(pattern);
    }
    const codes = result.value.warnings.map((warning) => warning.code);
    for (const code of 'warnings' in expected ? expected.warnings : [])
      expect(codes).toContain(code);
  });
});

describe('sanitizeSvg — legitimate corpus', () => {
  it.each(legit)('accepts %s with every shape kept', (_name, input) => {
    const result = sanitizeSvg(encode(input));
    if (!result.ok) throw new Error(`refused: ${result.error.code} ${result.error.reason}`);

    expect(shapeCount(result.value.svg)).toBe(shapeCount(input));
    expect(result.value.svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    expect(result.value.svg).toMatch(/^<svg[^>]* viewBox="0 0 100 100"/);
    expect(result.value.svg).not.toMatch(/^<svg[^>]* (width|height)=/);
  });

  it.each(legit)('is idempotent on %s', (_name, input) => {
    const once = sanitizeSvg(encode(input));
    if (!once.ok) throw new Error(once.error.code);
    const twice = sanitizeSvg(encode(once.value.svg));

    expect(twice.ok && twice.value.svg).toBe(once.value.svg);
  });

  it.each(legit)('is deterministic on %s', (_name, input) => {
    expect(sanitizeSvg(encode(input))).toEqual(sanitizeSvg(encode(input)));
  });

  it('inlines <style> rules and drops the class attribute', () => {
    const input = legit.find(([name]) => name.includes('08-style'))?.[1] ?? '';
    const result = sanitizeSvg(encode(input));
    if (!result.ok) throw new Error(result.error.code);

    expect(result.value.svg).not.toContain('<style');
    expect(result.value.svg).not.toContain('class=');
    expect(result.value.svg).toContain('fill="#1F4BFF"');
    expect(result.value.svg).toContain('fill="#FFD60A"');
  });
});

describe('sanitizeSvg — nested viewBox', () => {
  it('keeps a numeric nested viewBox and drops a malformed one (renderers ignore it anyway)', () => {
    const symbol = (viewBox: string) =>
      sanitizeSvg(
        encode(
          `${OPEN}<symbol id="s" viewBox="${viewBox}"><rect width="1" height="1"/></symbol></svg>`,
        ),
      );
    const valid = symbol('0,0 10 10');
    expect(valid.ok && valid.value.svg).toContain('<symbol id="s" viewBox="0 0 10 10">');
    for (const malformed of ['onload0 0 10 10', '0 0 10', '0 0 -1 10', '1 2 3 x']) {
      const result = symbol(malformed);
      expect(result.ok && result.value.svg).toContain('<symbol id="s">');
    }
  });
});

describe('sanitizeSvg — properties', () => {
  const FORBIDDEN = ['onload', 'javascript:', '<script', '<!ENTITY'];

  it('never outputs a forbidden pattern inserted anywhere in a legitimate SVG', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...legit.map(([, input]) => input)),
        fc.constantFrom(...FORBIDDEN),
        fc.double({ min: 0, max: 1, noNaN: true }),
        (input, pattern, where) => {
          const at = Math.floor(where * input.length);
          const result = sanitizeSvg(encode(input.slice(0, at) + pattern + input.slice(at)));
          if (result.ok)
            expect(result.value.svg.toLowerCase()).not.toContain(pattern.toLowerCase());
        },
      ),
      { numRuns: 300 },
    );
  });

  it('explains how to fix a <text> element', () => {
    const result = sanitizeSvg(encode(`${OPEN}<text>Brand</text></svg>`));
    expect(!result.ok && result.error.hint).toBe('convert-text-to-outlines');
  });
});
