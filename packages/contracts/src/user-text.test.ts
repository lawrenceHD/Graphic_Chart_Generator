import { describe, expect, it } from 'vitest';
import { userText } from './user-text.js';

describe('userText', () => {
  const title = userText(10, 1);

  it('trims and normalises to NFC', () => {
    expect(title.parse('  Café ')).toBe('Café');
  });

  it('enforces bounds after trimming', () => {
    expect(title.safeParse('   ').success).toBe(false);
    expect(title.safeParse('x'.repeat(11)).success).toBe(false);
  });

  it('refuses markup but keeps comparisons', () => {
    expect(title.safeParse('<b>x</b>').success).toBe(false);
    expect(title.safeParse('</x').success).toBe(false);
    expect(title.safeParse('a < b').success).toBe(true);
  });
});
