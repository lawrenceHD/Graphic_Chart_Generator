import { describe, expect, it } from 'vitest';
import { DEMO_VIEW } from './demo';
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
  it('returns at least one example with a unique id each', () => {
    const examples = listExamples();
    expect(examples.length).toBeGreaterThan(0);
    expect(new Set(examples.map((entry) => entry.id)).size).toBe(examples.length);
  });
});
