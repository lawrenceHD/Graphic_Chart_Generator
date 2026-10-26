import { z } from 'zod';

// Mockup scene format (06_MOCKUP_ENGINE §3). The geometric checks that need maths (convex,
// unmirrored quad) live in mockup-engine's parseScene; this schema checks the shape only.

export const SceneCategory = z.enum(['stationery', 'digital', 'signage', 'generic']);
export type SceneCategory = z.infer<typeof SceneCategory>;

export const MockupFinish = z.enum(['flat', 'emboss', 'deboss', 'foil']);
export type MockupFinish = z.infer<typeof MockupFinish>;

const Slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const Unit = z.number().min(0).max(1);
const PixelCorner = z.tuple([z.number().int().nonnegative(), z.number().int().nonnegative()]);
const UNIT_TOLERANCE = 1e-2;

const SceneSurface = z.strictObject({
  id: Slug,
  quad: z.tuple([PixelCorner, PixelCorner, PixelCorner, PixelCorner]),
  logoBox: z.strictObject({
    aspect: z.number().positive().max(100),
    fit: z.literal('contain'),
    paddingRatio: z.number().min(0).lt(0.5),
  }),
  baseTint: z.tuple([Unit, Unit, Unit]),
  light: z.strictObject({
    direction: z
      .tuple([z.number(), z.number(), z.number()])
      .refine(([x, y, w]) => Math.abs(Math.hypot(x, y, w) - 1) <= UNIT_TOLERANCE, {
        message: 'light.direction must be a unit vector',
      }),
  }),
  finishes: z
    .array(MockupFinish)
    .min(1)
    .refine((finishes) => new Set(finishes).size === finishes.length, {
      message: 'finishes must be unique',
    }),
});
export type SceneSurface = z.infer<typeof SceneSurface>;

export const SceneDefinition = z
  .strictObject({
    id: Slug,
    schemaVersion: z.literal(1),
    category: SceneCategory,
    size: z.strictObject({
      width: z.number().int().positive().max(16384),
      height: z.number().int().positive().max(16384),
    }),
    surfaces: z.array(SceneSurface).min(1),
  })
  .superRefine((scene, ctx) => {
    const ids = new Set<string>();
    scene.surfaces.forEach((surface, index) => {
      if (ids.has(surface.id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['surfaces', index, 'id'],
          message: 'duplicate surface id',
        });
      }
      ids.add(surface.id);
      surface.quad.forEach(([x, y], corner) => {
        if (x > scene.size.width || y > scene.size.height) {
          ctx.addIssue({
            code: 'custom',
            path: ['surfaces', index, 'quad', corner],
            message: 'corner outside the scene',
          });
        }
      });
    });
  });
export type SceneDefinition = z.infer<typeof SceneDefinition>;
