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

describe('listExamples', () => {
  it('returns every example of the set, in order, with distinct palettes', () => {
    const examples = listExamples();
    expect(examples.map((entry) => entry.id)).toEqual(EXAMPLES.map((entry) => entry.id));
    expect(examples.length).toBeGreaterThanOrEqual(3);
    expect(new Set(examples.map((entry) => entry.colors[0]?.hex)).size).toBe(examples.length);
  });
});
