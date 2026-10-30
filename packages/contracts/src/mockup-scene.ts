import { z } from 'zod';

// Mockup scene format (06_MOCKUP_ENGINE §3). The geometric checks that need maths (convex,
// unmirrored quad) live in mockup-engine's parseScene; this schema checks the shape only.

export const SceneCategory = z.enum([
  'stationery',
  'digital',
  'signage',
  'generic',
  'hospitality',
  'packaging',
  'apparel',
]);
export type SceneCategory = z.infer<typeof SceneCategory>;

// v2 adds the finishes of real collateral: print (ink that takes the support's texture), embroidery,
// engrave (wood, stone, metal) and screen (a display, lit from within).
export const MockupFinish = z.enum([
  'flat',
  'emboss',
  'deboss',
  'foil',
  'print',
  'embroidery',
  'engrave',
  'screen',
]);
export type MockupFinish = z.infer<typeof MockupFinish>;

export const SurfaceMaterial = z.enum([
  'paper',
  'card',
  'fabric',
  'ceramic',
  'stone',
  'wood',
  'metal',
  'screen',
]);
export type SurfaceMaterial = z.infer<typeof SurfaceMaterial>;

/** Palette roles a surface may be painted in, in order of preference (the art direction picks). */
export const SurfacePaint = z.enum(['primary', 'accent', 'neutralLight', 'neutralDark', 'none']);
export type SurfacePaint = z.infer<typeof SurfacePaint>;

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
  /** v2: grey mask of the object (file beside scene.json); the painted region. */
  mask: z
    .string()
    .regex(/^[a-z0-9-]+\.png$/)
    .optional(),
  material: SurfaceMaterial.optional(),
  paint: z.array(SurfacePaint).min(1).max(5).optional(),
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
    schemaVersion: z.union([z.literal(1), z.literal(2)]),
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

// Scenes baked from Photoshop mockups (tools/psd-mockups/bake.py, schema 3): layers replayed bottom to top.
const PsdFile = z.string().regex(/^[a-z0-9-]+\.(png|webp)$/);
export const PSD_BLENDS = [
  'normal',
  'multiply',
  'screen',
  'overlay',
  'soft-light',
  'darken',
  'lighten',
] as const;
const Blend = z.enum(PSD_BLENDS);
const Opacity = z.number().min(0).max(1);
const Role = z.enum(['primary', 'accent', 'neutralLight', 'neutralDark']);

export const PsdLayerSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('image'), src: PsdFile, blend: Blend, opacity: Opacity }),
  z.strictObject({
    type: z.literal('paint'),
    mask: PsdFile,
    paint: z.array(Role).min(1),
    opacity: Opacity,
  }),
  z.strictObject({
    type: z.literal('slot'),
    id: z.string().regex(/^[a-z0-9-]+$/),
    role: z.string().regex(/^[a-z0-9-]+$/),
    aspect: z.number().positive().max(20),
    blend: Blend,
    opacity: Opacity,
    uv: PsdFile,
    vv: PsdFile,
  }),
]);
export type PsdLayer = z.infer<typeof PsdLayerSchema>;

export const PsdSceneSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9-]+$/),
  kind: z.literal('psd'),
  schemaVersion: z.literal(3),
  size: z.strictObject({
    width: z.number().int().positive().max(8192),
    height: z.number().int().positive().max(8192),
  }),
  layers: z.array(PsdLayerSchema).min(1).max(64),
});
export type PsdScene = z.infer<typeof PsdSceneSchema>;

export type PsdBlend = (typeof PSD_BLENDS)[number];
