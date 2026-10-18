import { z } from 'zod';

/**
 * User-entered text (04_API_CONTRACTS.md §4: NFC, bounded, no HTML). Trimmed, normalised rather than refused,
 * and anything that opens a tag (`<` followed by a letter, `/` or `!`) is refused.
 */
export function userText(max: number, min = 0) {
  return z
    .string()
    .transform((value) => value.trim().normalize('NFC'))
    .pipe(
      z
        .string()
        .min(min)
        .max(max)
        .refine((value) => !/<[A-Za-z/!]/u.test(value), { message: 'HTML is not allowed' }),
    );
}
