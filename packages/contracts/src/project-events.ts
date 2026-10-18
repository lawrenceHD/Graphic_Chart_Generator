import { z } from 'zod';
import { AssetErrorCodeSchema } from './asset-errors.js';

// 04_API_CONTRACTS.md §5: events of a project's SSE stream. Written by the web app and the worker into the
// project_events log, read back by the stream: validated on both sides.
const ErrorCode = z
  .string()
  .regex(/^[A-Z][A-Z0-9_]{0,63}$/)
  .optional();
const event = <T extends string, D extends z.ZodType>(type: T, data: D) =>
  z.object({ type: z.literal(type), data }).strict();

export const ProjectEventSchema = z.discriminatedUnion('type', [
  event(
    'asset.status',
    z
      .object({
        assetId: z.uuid(),
        status: z.enum(['pending', 'quarantined', 'clean', 'rejected']),
        rejectReason: AssetErrorCodeSchema.optional(),
      })
      .strict(),
  ),
  event(
    'analysis.step',
    z
      .object({
        step: z.int().min(1).max(4),
        state: z.enum(['running', 'done', 'failed']),
        code: ErrorCode,
      })
      .strict(),
  ),
  event('analysis.done', z.object({ seq: z.int().nonnegative() }).strict()),
  event(
    'export.status',
    z
      .object({
        exportId: z.uuid(),
        status: z.enum(['pending', 'running', 'done', 'failed']),
        error: ErrorCode,
      })
      .strict(),
  ),
]);
export type ProjectEvent = z.infer<typeof ProjectEventSchema>;

/** A stored event, or null when it no longer matches the contract (never sent to a client). */
export function parseProjectEvent(type: string, data: unknown): ProjectEvent | null {
  const parsed = ProjectEventSchema.safeParse({ type, data });
  return parsed.success ? parsed.data : null;
}
