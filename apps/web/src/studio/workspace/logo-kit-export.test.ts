import { describe, expect, it } from 'vitest';
import { DEMO_VIEW } from '../../landing/demo';
import type { BrandView } from './brand-view';
import { logoKitPlan, readme } from './logo-kit-export';

const withVariants: BrandView = {
  ...DEMO_VIEW,
  name: 'La Mèza',
  logo: {
    color: '/api/v1/assets/a/content',
    vector: '/api/v1/assets/v/content',
    'mono-black': '/api/v1/assets/b/content',
    'mono-white': '/api/v1/assets/w/content',
    favicon: null,
  },
};

describe('logoKitPlan — the files of the logo kit', () => {
  it('gives every version as SVG and as PNG at three widths, in one folder per version', () => {
    const plan = logoKitPlan(withVariants);
    const names = plan.map((entry) => entry.path);

    expect(names).toContain('la-meza-logo/couleur/la-meza-couleur.svg');
    expect(names).toContain('la-meza-logo/couleur/la-meza-couleur-2048.png');
    expect(names).toContain('la-meza-logo/noir/la-meza-noir-512.png');
    expect(names).toContain('la-meza-logo/blanc/la-meza-blanc.svg');
    expect(names).toContain('la-meza-logo/couleur-principale/la-meza-couleur-principale.svg');
    // The upload itself, untouched.
    expect(names).toContain('la-meza-logo/original/la-meza-original');
    // 4 versions × (SVG + 3 PNG) + the original.
    expect(plan).toHaveLength(17);
    const tinted = plan.find((entry) => entry.path.endsWith('couleur-principale.svg'));
    expect(tinted?.tint).toBe(withVariants.colors.primary);
  });

  it('keeps to the upload when the logo has no vector version', () => {
    const plan = logoKitPlan({
      ...withVariants,
      logo: { ...withVariants.logo, vector: null, 'mono-black': null, 'mono-white': null },
    });

    expect(plan.map((entry) => entry.path)).toEqual([
      'la-meza-logo/original/la-meza-original',
      'la-meza-logo/couleur/la-meza-couleur-512.png',
      'la-meza-logo/couleur/la-meza-couleur-1024.png',
      'la-meza-logo/couleur/la-meza-couleur-2048.png',
    ]);
  });

  it('writes a read-me with the rules a printer or a developer needs', () => {
    const text = readme(withVariants);

    expect(text).toContain('La Mèza');
    expect(text).toContain(withVariants.colors.primary);
    expect(text).toContain(`${String(withVariants.rules.minSizePx)} px`);
  });
});
