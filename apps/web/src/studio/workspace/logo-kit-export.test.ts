import { describe, expect, it } from 'vitest';
import { EXAMPLES } from '../../landing/examples';
import { builtExample } from '../../landing/examples/build';
import type { BrandView } from './brand-view';
import { fileStem } from './export-files';
import { logoKitPlan, readme } from './logo-kit-export';

describe.each(EXAMPLES)('logoKitPlan of $id — the files of the logo kit', (example) => {
  const withVariants: BrandView = {
    ...builtExample(example.id).view,
    logo: {
      color: '/api/v1/assets/a/content',
      vector: '/api/v1/assets/v/content',
      'mono-black': '/api/v1/assets/b/content',
      'mono-white': '/api/v1/assets/w/content',
      favicon: null,
    },
  };
  const stem = fileStem(example.name);
  const folder = `${stem}-logo`;

  it('gives every version as SVG and as PNG at three widths, in one folder per version', () => {
    const plan = logoKitPlan(withVariants);
    const names = plan.map((entry) => entry.path);

    expect(names).toContain(`${folder}/couleur/${stem}-couleur.svg`);
    expect(names).toContain(`${folder}/couleur/${stem}-couleur-2048.png`);
    expect(names).toContain(`${folder}/noir/${stem}-noir-512.png`);
    expect(names).toContain(`${folder}/blanc/${stem}-blanc.svg`);
    expect(names).toContain(`${folder}/couleur-principale/${stem}-couleur-principale.svg`);
    // The upload itself, untouched.
    expect(names).toContain(`${folder}/original/${stem}-original`);
    // 4 versions × (SVG + 3 PNG) + the original.
    expect(plan).toHaveLength(17);
    const tinted = plan.find((entry) => entry.path.endsWith('couleur-principale.svg'));
    expect(tinted?.tint).toBe(withVariants.colors.primary);
  });

  it('adds the horizontal and vertical lockups the owner supplied, as PNG only', () => {
    const plan = logoKitPlan({
      ...withVariants,
      logo: {
        ...withVariants.logo,
        horizontal: '/api/v1/assets/h/content',
        vertical: '/api/v1/assets/t/content',
      },
    });
    const names = plan.map((entry) => entry.path);
    expect(names).toContain(`${folder}/horizontal/${stem}-horizontal-512.png`);
    expect(names).toContain(`${folder}/vertical/${stem}-vertical-2048.png`);
    expect(names.some((name) => name.endsWith('horizontal.svg'))).toBe(false);
    expect(plan).toHaveLength(23);
  });

  it('keeps to the upload when the logo has no vector version', () => {
    const plan = logoKitPlan({
      ...withVariants,
      logo: { ...withVariants.logo, vector: null, 'mono-black': null, 'mono-white': null },
    });

    expect(plan.map((entry) => entry.path)).toEqual([
      `${folder}/original/${stem}-original`,
      `${folder}/couleur/${stem}-couleur-512.png`,
      `${folder}/couleur/${stem}-couleur-1024.png`,
      `${folder}/couleur/${stem}-couleur-2048.png`,
    ]);
  });

  it('writes a read-me with the rules a printer or a developer needs', () => {
    const text = readme(withVariants);

    expect(text).toContain(example.name);
    expect(text).toContain(withVariants.colors.primary);
    expect(text).toContain(`${String(withVariants.rules.minSizePx)} px`);
  });
});
