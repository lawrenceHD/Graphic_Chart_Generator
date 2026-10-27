'use server';

import { cookies } from 'next/headers';
import { z } from 'zod';
import { LOCALE_COOKIE, LOCALES } from '../../i18n/locale';
import { THEME_COOKIE, THEME_PREFERENCES } from '../../theme/preference';

const ONE_YEAR = 60 * 60 * 24 * 365;

const Preference = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('theme'), value: z.enum(THEME_PREFERENCES) }),
  z.object({ kind: z.literal('locale'), value: z.enum(LOCALES) }),
]);

/** Saves a display preference; refuses anything outside the closed lists. */
export async function savePreference(input: unknown): Promise<{ readonly ok: boolean }> {
  const parsed = Preference.safeParse(input);
  if (!parsed.success) return { ok: false };
  (await cookies()).set(
    parsed.data.kind === 'theme' ? THEME_COOKIE : LOCALE_COOKIE,
    parsed.data.value,
    {
      path: '/',
      maxAge: ONE_YEAR,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
    },
  );
  return { ok: true };
}
