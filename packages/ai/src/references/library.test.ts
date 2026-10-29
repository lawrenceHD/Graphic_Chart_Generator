import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  BACKGROUND_KINDS,
  GUIDELINE_SECTIONS,
  REFERENCE_KINDS,
  REFERENCE_SECTORS,
  TYPE_STYLES,
  VISUAL_STYLES,
  WHITESPACE_LEVELS,
} from '@app/contracts';
import { direction, reference } from './fixtures.js';
import { parseReferenceIndex } from './library.js';

describe('parseReferenceIndex', () => {
  it('keeps the valid lines and reports every rejected one with its line number', () => {
    const good = JSON.stringify(reference('ok', 'restaurant', direction(0)));
    const badCard = JSON.stringify({
      ...reference('bad', 'restaurant', direction(0)),
      card: { kind: 'poster' },
    });
    const result = parseReferenceIndex(`${good}\n\nnot json\n${badCard}\n`);
    expect(result.references.map((entry) => entry.id)).toEqual(['ok']);
    expect(result.rejected).toEqual([3, 4]);
  });

  it('refuses mixed embedding sizes, which would make the similarity meaningless', () => {
    const a = JSON.stringify(reference('a', 'restaurant', direction(0)));
    const b = JSON.stringify({
      ...reference('b', 'restaurant', direction(0)),
      embedding: Array.from({ length: 128 }, () => 0.1),
    });
    const result = parseReferenceIndex(`${a}\n${b}`);
    expect(result.references.map((entry) => entry.id)).toEqual(['a']);
    expect(result.rejected).toEqual([2]);
  });
});

describe('parseReferenceIndex dimension', () => {
  it('keeps the majority size even when the first line is the odd one', () => {
    const odd = JSON.stringify({
      ...reference('odd', 'restaurant', direction(0)),
      embedding: Array.from({ length: 128 }, () => 0.1),
      model: { vision: 't', embedding: 'gemini-embedding-2', dimensions: 128 },
    });
    const a = JSON.stringify(reference('a', 'restaurant', direction(0)));
    const b = JSON.stringify(reference('b', 'restaurant', direction(1)));
    const result = parseReferenceIndex(`${odd}
${a}
${b}`);
    expect(result.references.map((entry) => entry.id)).toEqual(['a', 'b']);
    expect(result.rejected).toEqual([1]);
  });
});

describe('parseReferenceIndex duplicates', () => {
  it('counts a reference indexed twice (resumed run) once and reports the copy', () => {
    const line = JSON.stringify(reference('a', 'restaurant', direction(0)));
    const result = parseReferenceIndex(`${line}
${line}`);
    expect(result.references).toHaveLength(1);
    expect(result.rejected).toEqual([2]);
  });
});

describe('vocabulary shared with the Python indexer', () => {
  it('is identical to tools/references/vocabulary.json', () => {
    const vocabulary: unknown = JSON.parse(
      readFileSync(
        new URL('../../../../tools/references/vocabulary.json', import.meta.url),
        'utf8',
      ),
    );
    expect(vocabulary).toEqual({
      kinds: REFERENCE_KINDS,
      sections: GUIDELINE_SECTIONS,
      styles: VISUAL_STYLES,
      typeStyles: TYPE_STYLES,
      whitespace: WHITESPACE_LEVELS,
      backgrounds: BACKGROUND_KINDS,
    });
  });

  it('lists the same sectors as tools/references/sectors.json', () => {
    const config: unknown = JSON.parse(
      readFileSync(new URL('../../../../tools/references/sectors.json', import.meta.url), 'utf8'),
    );
    const sectors =
      typeof config === 'object' && config !== null && 'sectors' in config ? config.sectors : {};
    expect(Object.keys(sectors ?? {})).toEqual(REFERENCE_SECTORS);
  });
});
