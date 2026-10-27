import { describe, expect, it } from 'vitest';
import { DEFAULT_LOCALE, LOCALES, resolveLocale } from './locale';

describe('resolveLocale (02_ARCHITECTURE §i18n: French by default, English)', () => {
  it('supports exactly fr and en, French first', () => {
    expect(LOCALES).toEqual(['fr', 'en']);
    expect(DEFAULT_LOCALE).toBe('fr');
  });

  it('falls back to French without any hint', () => {
    expect(resolveLocale(undefined, null)).toBe('fr');
    expect(resolveLocale('', '')).toBe('fr');
  });

  it('follows a valid saved choice before the browser languages', () => {
    expect(resolveLocale('en', 'fr-FR,fr;q=0.9')).toBe('en');
    expect(resolveLocale('fr', 'en-US,en;q=0.9')).toBe('fr');
  });

  it('ignores an unknown or forged saved choice', () => {
    expect(resolveLocale('de', 'en-GB')).toBe('en');
    expect(resolveLocale('<script>', null)).toBe('fr');
  });

  it('picks the best supported browser language by quality', () => {
    expect(resolveLocale(undefined, 'en-US,en;q=0.9,fr;q=0.8')).toBe('en');
    expect(resolveLocale(undefined, 'de-DE,fr;q=0.5,en;q=0.4')).toBe('fr');
    expect(resolveLocale(undefined, 'de-DE,es;q=0.9')).toBe('fr');
    expect(resolveLocale(undefined, 'en;q=0.2,fr-CA;q=0.7')).toBe('fr');
    expect(resolveLocale(undefined, 'fr;q=5,en')).toBe('en');
  });

  it('survives malformed Accept-Language headers', () => {
    expect(resolveLocale(undefined, ';;;q=abc,,EN')).toBe('en');
    expect(resolveLocale(undefined, 'x'.repeat(5000))).toBe('fr');
  });
});
