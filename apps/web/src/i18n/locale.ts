import { z } from 'zod';

export const LOCALES = ['fr', 'en'] as const;
export const DEFAULT_LOCALE = 'fr';
export const LOCALE_COOKIE = 'NEXT_LOCALE';

const Locale = z.enum(LOCALES);
export type Locale = z.infer<typeof Locale>;

const MAX_HEADER_LENGTH = 1024;

/** Saved choice (cookie) first, then the best supported browser language, then French. */
export function resolveLocale(saved: string | undefined, acceptLanguage: string | null): Locale {
  const fromCookie = Locale.safeParse(saved);
  if (fromCookie.success) return fromCookie.data;
  if (acceptLanguage === null || acceptLanguage.length > MAX_HEADER_LENGTH) return DEFAULT_LOCALE;

  const ranked = acceptLanguage
    .split(',')
    .map((entry, index) => {
      const [tag = '', ...params] = entry.trim().split(';');
      const q = params
        .map((param) => /^\s*q=([\d.]+)\s*$/.exec(param)?.[1])
        .find((value) => value !== undefined);
      const quality = q === undefined ? 1 : Number(q);
      return {
        language: tag.split('-')[0]?.toLowerCase() ?? '',
        quality: quality >= 0 && quality <= 1 ? quality : 0, // RFC 9110: qvalue in [0, 1]; invalid entries are dropped
        index,
      };
    })
    .filter((entry) => entry.quality > 0)
    .sort((a, b) => b.quality - a.quality || a.index - b.index);

  for (const { language } of ranked) {
    const supported = Locale.safeParse(language);
    if (supported.success) return supported.data;
  }
  return DEFAULT_LOCALE;
}
