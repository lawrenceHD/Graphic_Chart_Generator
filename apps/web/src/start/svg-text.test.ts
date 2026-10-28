import { describe, expect, it } from 'vitest';
import { findLiveText } from './svg-text';

describe('findLiveText', () => {
  it('finds live text and names its fonts, as exported by Illustrator', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"><defs><style>
      .cls-4{font-family:AnecorGheroos, 'Anecor Gheroos';font-size:40px}
      .cls-7{font-family:Eternalo;}.cls-8{font-family:"Eternalo", serif}</style></defs>
      <text class="cls-4" transform="translate(106 109)">La Mèza</text></svg>`;
    expect(findLiveText(svg)).toEqual({ fonts: ['Anecor Gheroos', 'Eternalo'] });
  });

  it('reads font-family attributes and tspan-only text', () => {
    const svg = '<svg><tspan font-family="Inter, sans-serif">A</tspan></svg>';
    expect(findLiveText(svg)).toEqual({ fonts: ['Inter'] });
  });

  it('returns null for a logo made of outlines only', () => {
    const svg = '<svg><path d="M0 0h10v10z"/><g class="text-muted"/></svg>';
    expect(findLiveText(svg)).toBeNull();
  });
});
