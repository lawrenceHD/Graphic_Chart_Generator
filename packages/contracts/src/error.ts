import { z } from 'zod';

export const ProblemDetailsSchema = z.object({
  type: z.string().min(1),
  title: z.string().min(1),
  status: z.number().int().min(400).max(599),
  code: z.string().min(1),
  detail: z.string().min(1),
  hint: z.string().min(1).optional(),
});

export type ProblemDetails = z.infer<typeof ProblemDetailsSchema>;

export function problem(
  code: string,
  status: number,
  detail: string,
  hint?: string,
): ProblemDetails {
  const title = code
    .toLowerCase()
    .split('_')
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(' ');
  const type = `/errors/${code.toLowerCase().replaceAll('_', '-')}`;

  return ProblemDetailsSchema.parse({
    type,
    title,
    status,
    code,
    detail,
    ...(hint === undefined ? {} : { hint }),
  });
}
