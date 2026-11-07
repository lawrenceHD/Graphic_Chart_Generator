import { contrastRatio } from '@app/color-engine';
import { describe, expect, it } from 'vitest';
import { DEMO_VIEW } from './demo';
import { EXAMPLES } from './examples';
import { exampleFromView, listExamples } from './example-source';

describe('exampleFromView', () => {
  const example = exampleFromView('demo', DEMO_VIEW);

  it('carries the brand identity as plain serialisable data', () => {
    expect(example.id).toBe('demo');
    expect(example.name).toBe(DEMO_VIEW.name);
    expect(JSON.parse(JSON.stringify(example))).toEqual(example);
  });

  it('lists the four roles with the document colours', () => {
    expect(example.colors.map((color) => color.role)).toEqual([
      'primary',
      'accent',
      'neutralLight',
      'neutralDark',
    ]);
    expect(example.colors[0]?.hex).toBe(DEMO_VIEW.colors.primary);
  });

  it('measures contrasts with the colour engine, not by hand', () => {
    const darkOnLight = example.contrasts.find(
      (pair) => pair.foreground === 'neutralDark' && pair.background === 'neutralLight',
    );
    expect(darkOnLight?.ratio).toMatch(/^\d+\.\d{2}$/);
    expect(Number(darkOnLight?.ratio)).toBeGreaterThan(15);
    expect(darkOnLight?.level).toBe('aaa');
  });

  it('writes tokens from the brand colours', () => {
    expect(example.tokens).toContain(`--color-primary: ${DEMO_VIEW.colors.primary};`);
  });
});

describe('contrast pairs follow what a designer would use', () => {
  const byId = (id: string) => {
    const found = listExamples().find((entry) => entry.id === id);
    if (found === undefined) throw new Error(`no example ${id}`);
    return found;
  };
  const hexOf = (example: ReturnType<typeof byId>, role: string): string =>
    example.colors.find((color) => color.role === role)?.hex ?? '';

  it('always shows the text pair: ink on paper', () => {
    for (const example of listExamples()) {
      expect(
        example.contrasts.some(
          (p) => p.foreground === 'neutralDark' && p.background === 'neutralLight',
        ),
        example.id,
      ).toBe(true);
    }
  });

  it('puts paper on a dark primary and ink on a light primary, never the unreadable one', () => {
    for (const example of listExamples()) {
      const onPrimary = example.contrasts.filter((p) => p.background === 'primary');
      expect(onPrimary, example.id).toHaveLength(1);
      const shown = onPrimary[0];
      if (shown === undefined) throw new Error('unreachable');
      const paper = contrastRatio(hexOf(example, 'neutralLight'), hexOf(example, 'primary'));
      const ink = contrastRatio(hexOf(example, 'neutralDark'), hexOf(example, 'primary'));
      expect(shown.foreground, example.id).toBe(paper >= ink ? 'neutralLight' : 'neutralDark');
      expect(Number(shown.ratio), example.id).toBeGreaterThanOrEqual(
        Math.floor(Math.max(paper, ink) * 100) / 100 - 0.01,
      );
    }
  });

  it('shows the dark brand Halden with paper on primary, not 1.35:1', () => {
    const halden = byId('halden-advisory');
    const pair = halden.contrasts.find((p) => p.background === 'primary');
    expect(pair?.foreground).toBe('neutralLight');
    expect(Number(pair?.ratio)).toBeGreaterThan(10);
  });

  it('keeps primary on paper only when the brand colour reads there (3:1 and more)', () => {
    for (const example of listExamples()) {
      const shown = example.contrasts.find((p) => p.foreground === 'primary');
      const ratio = contrastRatio(hexOf(example, 'primary'), hexOf(example, 'neutralLight'));
      expect(shown !== undefined, example.id).toBe(ratio >= 3);
    }
  });
});

describe('listExamples', () => {
  it('returns every example of the set, in order, with distinct palettes', () => {
    const examples = listExamples();
    expect(examples.map((entry) => entry.id)).toEqual(EXAMPLES.map((entry) => entry.id));
    expect(examples.length).toBeGreaterThanOrEqual(3);
    expect(new Set(examples.map((entry) => entry.colors[0]?.hex)).size).toBe(examples.length);
  });
});
