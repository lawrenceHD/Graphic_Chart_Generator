import { describe, expect, it } from 'vitest';
import { rulesOf, withShares } from './compose-inputs.js';

const roles = {
  primary: { hex: '#1F4BFF', source: 'extracted' as const },
  accent: { hex: '#FF6B35', source: 'derived' as const },
  neutralLight: { hex: '#ffffff', source: 'extracted' as const },
  neutralDark: { hex: '#12161F', source: 'extracted' as const },
  extra: [{ hex: '#00AA55', source: 'extracted' as const }],
};

describe('withShares', () => {
  it('gives each extracted colour the share measured on the logo, matched by hex', () => {
    const shared = withShares(roles, [
      { hex: '#1f4bff', share: 0.5 },
      { hex: '#FFFFFF', share: 0.3 },
      { hex: '#12161F', share: 0.15 },
      { hex: '#00AA55', share: 0.05 },
    ]);
    expect(shared.primary).toEqual({ hex: '#1F4BFF', source: 'extracted', share: 0.5 });
    expect(shared.neutralLight.share).toBeCloseTo(0.3, 10);
    expect(shared.extra[0]?.share).toBeCloseTo(0.05, 10);
  });

  it('gives no share to a derived colour, nor to one the clusters do not hold', () => {
    const shared = withShares(roles, [{ hex: '#FF6B35', share: 0.2 }]);
    expect(shared.accent).toEqual({ hex: '#FF6B35', source: 'derived' });
    expect(shared.primary).toEqual({ hex: '#1F4BFF', source: 'extracted' });
  });
});

describe('withShares, counted once and normalised', () => {
  it('gives a hex held by two roles to the first one only', () => {
    const twice = { ...roles, neutralDark: { hex: '#1f4bff', source: 'extracted' as const } };
    const shared = withShares(twice, [
      { hex: '#1F4BFF', share: 0.6 },
      { hex: '#FFFFFF', share: 0.4 },
    ]);
    expect(shared.primary.share).toBe(0.6);
    expect(shared.neutralDark.share).toBeUndefined();
  });

  it('scales the shares of the roles so that they sum to 1', () => {
    const shared = withShares(roles, [
      { hex: '#1F4BFF', share: 0.3 },
      { hex: '#FFFFFF', share: 0.1 },
      { hex: '#12161F', share: 0.1 },
      { hex: '#ABCDEF', share: 0.5 },
    ]);
    expect(shared.primary.share).toBeCloseTo(0.6, 10);
    const all = [
      shared.primary,
      shared.accent,
      shared.neutralLight,
      shared.neutralDark,
      ...shared.extra,
    ];
    expect(all.reduce((sum, color) => sum + (color.share ?? 0), 0)).toBeCloseTo(1, 10);
  });
});

describe('rulesOf', () => {
  const minimum = { heightPx: 24, widthPx: 68, heightMm: 5, widthMm: 14 };
  it('keeps the minimum of each version and says what x is', () => {
    const symbolMinimum = { heightPx: 16, widthPx: 12, heightMm: 3, widthMm: 2.5 };
    expect(
      rulesOf({
        bbox: { x: 0, y: 0, width: 280, height: 100 },
        clearSpace: { x: 30, source: 'element' },
        minimum,
        symbolMinimum,
      }),
    ).toEqual({
      clearSpaceRatio: 0.3,
      minSizePx: 68,
      minSizeMm: 14,
      clearSpaceSource: 'element',
      versions: { full: minimum, symbol: symbolMinimum },
    });
  });

  it('has no symbol version for a mark alone', () => {
    const rules = rulesOf({
      bbox: { x: 0, y: 0, width: 100, height: 100 },
      clearSpace: { x: 25, source: 'convention' },
      minimum,
    });
    expect(rules.versions).toEqual({ full: minimum });
    expect(rules.clearSpaceSource).toBe('convention');
  });
});
