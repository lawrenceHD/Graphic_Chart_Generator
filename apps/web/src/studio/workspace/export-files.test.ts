import { describe, expect, it } from 'vitest';
import { builtExample } from '../../landing/examples/build';
import { EXAMPLES } from '../../landing/examples';
import { cssTokens, dtcgTokens, fileStem, tailwindTheme } from './export-files';

describe.each(EXAMPLES)('export files of $id', (example) => {
  const view = builtExample(example.id).view;

  it('names files after the brand, without accents or spaces', () => {
    const stem = fileStem(example.name);
    expect(stem).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u);
    expect(stem.replaceAll('-', '')).toBe(
      example.name
        .normalize('NFD')
        .replace(/[^A-Za-z0-9]/gu, '')
        .toLowerCase(),
    );
    expect(fileStem('  ')).toBe('brand');
  });

  it('writes the four roles, the scale, the fonts and the logo rules as CSS variables', () => {
    const css = cssTokens(view);
    expect(css).toContain(`--color-primary: ${example.colors.primary.hex.toUpperCase()};`);
    expect(css).toContain(
      `--color-neutral-light: ${example.colors.neutralLight.hex.toUpperCase()};`,
    );
    expect(css).toMatch(/--color-primary-500: #[0-9A-F]{6};/u);
    expect(css).toContain(`--font-display: '${view.pairing.display.name}`);
    expect(css).toMatch(/--logo-clear-space: \d(?:\.\d+)?;/u);
    expect(tailwindTheme(view)).toContain('@theme {');
  });

  it('writes W3C design tokens that parse and carry their types', () => {
    const tokens: unknown = JSON.parse(dtcgTokens(view));
    expect(tokens).toMatchObject({
      color: { primary: { $type: 'color', $value: example.colors.primary.hex.toUpperCase() } },
      font: { display: { $type: 'fontFamily', $value: view.pairing.display.name } },
      logo: { 'min-size': { $type: 'dimension' } },
    });
  });
});

describe('measured ratios in the exported files', () => {
  it('are rounded to two decimals, never a floating-point tail', () => {
    const view = {
      ...builtExample(EXAMPLES[0]?.id ?? '').view,
      rules: {
        ...builtExample(EXAMPLES[0]?.id ?? '').view.rules,
        clearSpaceRatio: 0.11999999999999998,
      },
    };

    expect(cssTokens(view)).toContain('--logo-clear-space: 0.12;');
    expect(dtcgTokens(view)).toContain('"$value": 0.12');
  });
});
