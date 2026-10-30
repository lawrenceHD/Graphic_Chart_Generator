import { describe, expect, it } from 'vitest';
import { tintSvg } from './logo-tint';

describe('tintSvg — one-colour logo in a brand colour (R5 of 16_GUIDELINE_RULES.md)', () => {
  it('repaints the black of the monochrome variant, fills and strokes, nothing else', () => {
    const mono =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><g fill="#000000"><path d="M0 0H5V5Z"/></g><path stroke="#000000" fill="none" d="M1 1L9 9"/><rect fill="#00000080" width="1" height="1"/></svg>';

    const tinted = tintSvg(mono, '#d88f7a');

    expect(tinted).toContain('fill="#D88F7A"');
    expect(tinted).toContain('stroke="#D88F7A"');
    expect(tinted).toContain('fill="none"');
    // An eight-digit colour is not the variant's black.
    expect(tinted).toContain('#00000080');
  });

  it('refuses a colour that is not #RRGGBB (it is written into markup)', () => {
    expect(tintSvg('<svg fill="#000000"/>', 'red" onload="x')).toBeNull();
  });
});
