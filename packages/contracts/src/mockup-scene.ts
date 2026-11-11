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

// ADR-034: a surface may be computed rather than flat. A revolution (cylinder, cone, bottle) is given by
// its top and bottom ellipses, three points each (left and right silhouettes, the point nearest the
// viewer); a mesh is a bicubic Bezier grid of (3k+1) x (3m+1) points, row by row, like Photoshop's
// custom warp. The maths (front point on the axis, unfolded grid) are checked by mockup-engine.
const Point = z.tuple([z.number().nonnegative(), z.number().nonnegative()]);
const EllipseBy3 = z.strictObject({ left: Point, right: Point, front: Point });
const BezierSide = z
  .number()
  .int()
  .min(4)
  .max(31)
  .refine((side) => (side - 1) % 3 === 0, { message: 'a Bezier grid side has 3k+1 points' });

export const SurfaceGeometry = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('quad'),
    quad: z.tuple([PixelCorner, PixelCorner, PixelCorner, PixelCorner]),
  }),
  z.strictObject({
    kind: z.literal('revolution'),
    top: EllipseBy3,
    bottom: EllipseBy3,
    /** Left silhouette from top to bottom; absent for a cylinder or a cone. */
    profile: z.array(Point).min(2).max(32).optional(),
    /** Physical top radius over bottom radius; absent means a cylinder (1). */
    radiusRatio: z.number().positive().max(10).optional(),
    /** Printable height, 0 the top ellipse and 1 the bottom one. */
    band: z
      .strictObject({ from: Unit, to: Unit })
      .refine((band) => band.from < band.to, { message: 'band.from must be above band.to' }),
    /** Angle the logo box spans around the axis; past the visible half, a wrap-around print is cut. */
    arcDegrees: z.number().positive().max(360),
    /** Centre of the logo box, 0 facing the viewer. */
    centreDegrees: z.number().min(-90).max(90).default(0),
  }),
  z
    .strictObject({
      kind: z.literal('mesh'),
      cols: BezierSide,
      rows: BezierSide,
      points: z.array(Point).max(31 * 31),
    })
    .refine((mesh) => mesh.points.length === mesh.rows * mesh.cols, {
      message: 'a mesh has rows x cols points',
      path: ['points'],
    }),
]);
export type SurfaceGeometry = z.infer<typeof SurfaceGeometry>;

/** Every point a geometry names, with its path, to check it against the picture. */
function geometryPoints(geometry: SurfaceGeometry): readonly [string, readonly [number, number]][] {
  if (geometry.kind === 'quad')
    return geometry.quad.map((point, index) => [`quad.${String(index)}`, point]);
  if (geometry.kind === 'mesh')
    return geometry.points.map((point, index) => [`points.${String(index)}`, point]);
  const ellipse = (name: string, e: z.infer<typeof EllipseBy3>) =>
    (['left', 'right', 'front'] as const).map((key): [string, readonly [number, number]] => [
      `${name}.${key}`,
      e[key],
    ]);
  return [
    ...ellipse('top', geometry.top),
    ...ellipse('bottom', geometry.bottom),
    ...(geometry.profile ?? []).map((point, index): [string, readonly [number, number]] => [
      `profile.${String(index)}`,
      point,
    ]),
  ];
}

/** Adds an issue for every geometry point outside the picture. */
function checkGeometry(
  geometry: SurfaceGeometry,
  size: { readonly width: number; readonly height: number },
  path: readonly (string | number)[],
  ctx: z.RefinementCtx,
): void {
  for (const [name, [x, y]] of geometryPoints(geometry)) {
    if (x > size.width || y > size.height) {
      ctx.addIssue({ code: 'custom', path: [...path, name], message: 'point outside the scene' });
    }
  }
}

const SceneSurface = z.strictObject({
  id: Slug,
  quad: z.tuple([PixelCorner, PixelCorner, PixelCorner, PixelCorner]),
  /** ADR-034: computed surface; the quad stays the hit region and the fallback. */
  geometry: SurfaceGeometry.optional(),
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
      if (surface.geometry !== undefined) {
        checkGeometry(surface.geometry, scene.size, ['surfaces', index, 'geometry'], ctx);
      }
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
    /** Baked maps, or `geometry` to compute them (ADR-034): exactly one of the two. */
    uv: PsdFile.optional(),
    vv: PsdFile.optional(),
    geometry: SurfaceGeometry.optional(),
  }),
]);
export type PsdLayer = z.infer<typeof PsdLayerSchema>;

export const PsdSceneSchema = z
  .strictObject({
    id: z.string().regex(/^[a-z0-9-]+$/),
    kind: z.literal('psd'),
    schemaVersion: z.literal(3),
    size: z.strictObject({
      width: z.number().int().positive().max(8192),
      height: z.number().int().positive().max(8192),
    }),
    layers: z.array(PsdLayerSchema).min(1).max(64),
  })
  .superRefine((scene, ctx) => {
    scene.layers.forEach((layer, index) => {
      if (layer.type !== 'slot') return;
      const baked = layer.uv !== undefined && layer.vv !== undefined;
      const half = (layer.uv === undefined) !== (layer.vv === undefined);
      if (half || baked === (layer.geometry !== undefined)) {
        ctx.addIssue({
          code: 'custom',
          path: ['layers', index],
          message: 'a slot has either its uv and vv maps or a geometry',
        });
      }
      if (layer.geometry !== undefined) {
        checkGeometry(layer.geometry, scene.size, ['layers', index, 'geometry'], ctx);
      }
    });
  });
export type PsdScene = z.infer<typeof PsdSceneSchema>;

export type PsdBlend = (typeof PSD_BLENDS)[number];
