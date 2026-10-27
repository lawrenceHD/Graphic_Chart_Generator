import { describe, expect, it } from 'vitest';
import { THEME_PREFERENCES, parseThemePreference, themeAttribute } from './preference';

describe('theme preference (owner decision 2026-10-23: system, day, night)', () => {
  it('offers system, light and dark, system by default', () => {
    expect(THEME_PREFERENCES).toEqual(['system', 'light', 'dark']);
    expect(parseThemePreference(undefined)).toBe('system');
  });

  it('keeps a valid saved preference and rejects anything else', () => {
    expect(parseThemePreference('dark')).toBe('dark');
    expect(parseThemePreference('light')).toBe('light');
    expect(parseThemePreference('DARK')).toBe('system');
    expect(parseThemePreference('"><script>')).toBe('system');
  });

  it('only sets data-theme when the user forces a theme', () => {
    expect(themeAttribute('system')).toBeUndefined();
    expect(themeAttribute('light')).toBe('light');
    expect(themeAttribute('dark')).toBe('dark');
  });
});
