import { describe, expect, it } from 'vitest';
import { DEMO_VIEW } from '../../landing/demo';
import { cssTokens, dtcgTokens, fileStem, tailwindTheme } from './export-files';

describe('export files', () => {
  it('names files after the brand, without accents or spaces', () => {
    expect(fileStem('La Mèza')).toBe('la-meza');
    expect(fileStem('  ')).toBe('brand');
  });

  it('writes the four roles, the scale, the fonts and the logo rules as CSS variables', () => {
    const css = cssTokens(DEMO_VIEW);
    expect(css).toContain('--color-primary: #D88F7A;');
    expect(css).toContain('--color-neutral-light: #FCF3F0;');
    expect(css).toMatch(/--color-primary-500: #[0-9A-F]{6};/u);
    expect(css).toContain("--font-display: 'Fraunces Variable'");
    expect(css).toContain('--logo-clear-space: 0.25;');
    expect(tailwindTheme(DEMO_VIEW)).toContain('@theme {');
  });

  it('writes W3C design tokens that parse and carry their types', () => {
    const tokens: unknown = JSON.parse(dtcgTokens(DEMO_VIEW));
    expect(tokens).toMatchObject({
      color: { primary: { $type: 'color', $value: '#D88F7A' } },
      font: { display: { $type: 'fontFamily', $value: 'Fraunces' } },
      logo: { 'min-size': { $type: 'dimension', $value: '24px' } },
    });
  });
});

describe('measured ratios in the exported files', () => {
  it('are rounded to two decimals, never a floating-point tail', () => {
    const view = {
      ...DEMO_VIEW,
      rules: { ...DEMO_VIEW.rules, clearSpaceRatio: 0.11999999999999998 },
    };

    expect(cssTokens(view)).toContain('--logo-clear-space: 0.12;');
    expect(dtcgTokens(view)).toContain('"$value": 0.12');
  });
});
