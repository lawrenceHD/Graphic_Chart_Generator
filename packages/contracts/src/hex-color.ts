import { z } from 'zod';

export const HexColor = z
  .string()
  .trim()
  .transform((val) => val.toUpperCase())
  .pipe(
    z.string().regex(/^#[0-9A-F]{6}$/, {
      message: 'Invalid hex color: must be in #RRGGBB format',
    }),
  );

export type HexColor = z.infer<typeof HexColor>;
