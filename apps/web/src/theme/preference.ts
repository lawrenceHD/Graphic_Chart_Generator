import { z } from 'zod';

// Owner decision 2026-10-23: day, night, and the system theme by default.
export const THEME_PREFERENCES = ['system', 'light', 'dark'] as const;
export const THEME_COOKIE = 'theme';

const ThemePreference = z.enum(THEME_PREFERENCES);
export type ThemePreference = z.infer<typeof ThemePreference>;

export function parseThemePreference(saved: string | undefined): ThemePreference {
  const parsed = ThemePreference.safeParse(saved);
  return parsed.success ? parsed.data : 'system';
}

/** `data-theme` on <html> forces a theme; without it, tokens.css follows the system. */
export function themeAttribute(preference: ThemePreference): 'light' | 'dark' | undefined {
  return preference === 'system' ? undefined : preference;
}
