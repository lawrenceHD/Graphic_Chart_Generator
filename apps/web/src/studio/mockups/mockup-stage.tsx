'use client';

import { PsdSceneSchema, type PsdScene } from '@app/contracts';
import {
  BLEND_CODES,
  createCompositor,
  renderPsdScene,
  type PsdRenderLayer,
  directScene,
  parseScene,
  placeLogo,
  surfaceUniforms,
  type Compositor,
  type CompositorLayer,
  type LoadedScene,
  type LogoVersion,
  type SurfaceDirection,
} from '@app/mockup-engine';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import type { BrandView } from '../workspace/brand-view';
import { drawArtwork, loadLogos, type ArtworkWords } from './artwork';

// Computed mockups (ADR-008, 06_MOCKUP_ENGINE v2). Each scene is a photograph whose objects are painted in
// the brand's colours — their light, folds and grain kept — and on which the real logo file is projected
// with a physical finish (print, foil, emboss, embroidery…) by the WebGL2 compositor of mockup-engine. The
// art direction (which colour, finish and logo version per object) is mockup-engine's directScene. The
// logo is never redrawn by a model: its pixels are the uploaded file's or its vector variants'.
export const SCENES = [
  // Photoshop mockups by designers (Firmbee, CC0), replayed layer by layer (tools/psd-mockups/bake.py).
  'cards-floating',
  'a4-sheet',
  'cards-stack',
  'poster-living',
  'poster-held',
  'poster-hanging',
  'mug-white',
  'mug-stripes',
  // Generated photographs of the hospitality pack, where a centred mark is what the object wants.
  'place-cards',
  'menu-table',
  'storefront-sign',
  'gift-box',
  'paper-bag',
] as const;
export type SceneId = (typeof SCENES)[number];

type AnyScene =
  | { readonly kind: 'photo'; readonly loaded: LoadedScene }
  | { readonly kind: 'psd'; readonly scene: PsdScene };
const cache = new Map<SceneId, Promise<AnyScene | null>>();
function loadScene(id: SceneId): Promise<AnyScene | null> {
  const known = cache.get(id);
  if (known !== undefined) return known;
  const loading = fetch(`/scenes/${id}/scene.json`)
    .then((response) => (response.ok ? response.json() : null))
    .then((json: unknown): AnyScene | null => {
      const psd = PsdSceneSchema.safeParse(json);
      if (psd.success) return { kind: 'psd', scene: psd.data };
      const parsed = parseScene(json);
      return parsed.ok ? { kind: 'photo', loaded: parsed.value } : null;
    })
    .catch(() => null)
    .then((loaded) => {
      // A failure is not remembered: the next stage asks again (a network blip must not hide a scene).
      if (loaded === null) cache.delete(id);
      return loaded;
    });
  cache.set(id, loading);
  return loading;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.decoding = 'async';
  // Logo files are redirected to the object storage (another origin, CORS-enabled): without CORS the
  // image would taint the canvas and WebGL would refuse it.
  image.crossOrigin = 'anonymous';
  image.src = src;
  return image.decode().then(() => image);
}

/** The logo file for a version: the vector drawing when there is one, the upload otherwise. */
export function logoSource(view: BrandView, version: LogoVersion): string {
  if (version === 'white') return view.logo['mono-white'] ?? view.logo.color;
  if (version === 'black') return view.logo['mono-black'] ?? view.logo.color;
  return view.logo.vector ?? view.logo.color;
}

/** Colours of the logo: the palette's main colours, its neutrals when they were read on the logo. */
export function brandInks(view: BrandView): string[] {
  const neutrals = (['neutralLight', 'neutralDark'] as const)
    .filter((role) => view.sources[role] === 'extracted')
    .map((role) => view.colors[role]);
  return [view.colors.primary, view.colors.accent, ...view.extra, ...neutrals];
}

/** What the render depends on: a view with the same colours and files keeps the picture. */
export function renderKey(view: BrandView): string {
  const { colors, logo } = view;
  return [
    colors.primary,
    colors.accent,
    colors.neutralLight,
    colors.neutralDark,
    ...view.extra,
    logo.color,
    logo.vector,
    logo['mono-black'],
    logo['mono-white'],
  ].join('|');
}

const LOGO_TEXELS = 2048;
/** The logo drawn on a canvas LOGO_TEXELS wide (an SVG is rasterised at that size, never upscaled). */
async function logoTexture(src: string): Promise<{ canvas: HTMLCanvasElement; aspect: number }> {
  const image = await loadImage(src);
  const aspect = image.naturalWidth / Math.max(1, image.naturalHeight);
  const canvas = document.createElement('canvas');
  canvas.width = LOGO_TEXELS;
  canvas.height = Math.max(1, Math.round(LOGO_TEXELS / aspect));
  const context = canvas.getContext('2d');
  if (context !== null) {
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
  }
  return { canvas, aspect };
}

const PAINT_ORDER = ['primary', 'accent', 'neutralLight', 'neutralDark'] as const;

/** A Photoshop mockup: its layers replayed, the brand's artwork in every slot, its fields painted. */
async function renderPsd(
  id: SceneId,
  scene: PsdScene,
  view: BrandView,
  words: ArtworkWords,
  node: HTMLCanvasElement,
  alive: () => boolean,
): Promise<readonly SurfaceDirection[] | null> {
  const file = (name: string) => loadImage(`/scenes/${id}/${name}`);
  const logos = await loadLogos(view);
  const layers: PsdRenderLayer[] = [];
  for (const layer of scene.layers) {
    if (layer.type === 'image') {
      layers.push({
        kind: 'image',
        image: await file(layer.src),
        mode: BLEND_CODES[layer.blend],
        opacity: layer.opacity,
      });
    } else if (layer.type === 'paint') {
      const role = PAINT_ORDER.find((entry) => layer.paint.includes(entry)) ?? 'neutralLight';
      layers.push({
        kind: 'paint',
        mask: await file(layer.mask),
        color: view.colors[role],
        opacity: layer.opacity,
      });
    } else {
      const [u, v, artwork] = await Promise.all([
        file(layer.uv),
        file(layer.vv),
        drawArtwork(layer.role, layer.aspect, view, logos, words),
      ]);
      layers.push({
        kind: 'slot',
        u,
        v,
        artwork,
        mode: BLEND_CODES[layer.blend],
        opacity: layer.opacity,
      });
    }
  }
  if (!alive()) return null;
  const run = queue.then(() => {
    const gl = sharedCanvas(scene.size.width, scene.size.height);
    if (!renderPsdScene(gl, layers)) throw new Error('webgl2');
    node.width = scene.size.width;
    node.height = scene.size.height;
    node.getContext('2d')?.drawImage(gl, 0, 0);
  });
  queue = run.catch(() => undefined);
  await run;
  return [];
}

async function renderScene(
  id: SceneId,
  view: BrandView,
  words: ArtworkWords,
  node: HTMLCanvasElement,
  alive: () => boolean,
): Promise<readonly SurfaceDirection[] | null> {
  const any = await loadScene(id);
  if (any === null) throw new Error('scene');
  if (any.kind === 'psd') return renderPsd(id, any.scene, view, words, node, alive);
  const { scene, homographies } = any.loaded;
  const directions = directScene(scene, view.colors, brandInks(view));
  const base = await loadImage(`/scenes/${id}/base.webp`);
  const layers: CompositorLayer[] = [];
  for (const surface of scene.surfaces) {
    const direction = directions.find((entry) => entry.surfaceId === surface.id);
    const h = homographies.get(surface.id);
    if (direction === undefined || h === undefined) continue;
    const [mask, logo] = await Promise.all([
      surface.mask === undefined ? null : loadImage(`/scenes/${id}/${surface.mask}`),
      logoTexture(logoSource(view, direction.logo)),
    ]);
    const rect = placeLogo(surface.logoBox, logo.aspect);
    if (!rect.ok) continue;
    const uniforms = surfaceUniforms({
      homography: h,
      rect: rect.value,
      paint: direction.paint,
      tint: surface.baseTint,
      finish: direction.finish,
      material: surface.material ?? 'paper',
      light: surface.light.direction,
      foil: direction.foil ?? 'gold',
      logoWidth: logo.canvas.width,
    });
    if (uniforms !== null) layers.push({ uniforms, mask, logo: logo.canvas });
  }
  if (!alive()) return null;
  // One WebGL context for every stage (browsers cap them): renders take turns, each result is copied
  // onto the stage's own 2D canvas.
  const run = queue.then(() => {
    const gl = sharedCompositor(scene.size.width, scene.size.height);
    gl.compositor.render(base, layers);
    node.width = scene.size.width;
    node.height = scene.size.height;
    node.getContext('2d')?.drawImage(gl.canvas, 0, 0);
  });
  queue = run.catch(() => undefined);
  await run;
  return directions;
}

let shared: { canvas: HTMLCanvasElement; compositor: Compositor } | null = null;
let psdCanvas: HTMLCanvasElement | null = null;
function sharedCanvas(width: number, height: number): HTMLCanvasElement {
  psdCanvas ??= document.createElement('canvas');
  psdCanvas.width = width;
  psdCanvas.height = height;
  return psdCanvas;
}
let queue: Promise<void> = Promise.resolve();
function sharedCompositor(width: number, height: number) {
  if (shared === null) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const compositor = createCompositor(canvas);
    if (compositor === null) throw new Error('webgl2');
    shared = { canvas, compositor };
  }
  shared.canvas.width = width;
  shared.canvas.height = height;
  return shared;
}

const SHAPE_ONLY = new Set(['foil', 'emboss', 'deboss', 'engrave']);

type Stage = 'loading' | 'ready' | 'failed';

export function MockupStage({
  scene: id,
  view,
  label,
  failedLabel,
  retryLabel,
  className = '',
  proof = false,
}: {
  readonly scene: SceneId;
  readonly view: BrandView;
  readonly label: string;
  /** Shown when the scene or the logo cannot be loaded, with a retry. */
  readonly failedLabel: string;
  readonly retryLabel: string;
  readonly className?: string;
  /** Show the art direction applied under the picture (finish, colour, logo version). */
  readonly proof?: boolean;
}) {
  const t = useTranslations('workspace.proof');
  const a = useTranslations('workspace.artwork');
  const [size, setSize] = useState({ width: 1920, height: 1088 });
  const [directions, setDirections] = useState<readonly SurfaceDirection[]>([]);
  const canvas = useRef<HTMLCanvasElement>(null);
  const latest = useRef(view);
  const [stage, setStage] = useState<Stage>('loading');
  const [attempt, setAttempt] = useState(0);
  const key = renderKey(view);

  useEffect(() => {
    latest.current = view;
  });

  useEffect(() => {
    let alive = true;
    const node = canvas.current;
    if (node === null) return;
    const words: ArtworkWords = {
      name: a('name'),
      title: a('title'),
      phone: a('phone'),
      email: a('email'),
      address: a('address'),
      dear: a('dear'),
    };
    renderScene(id, latest.current, words, node, () => alive)
      .then((done) => {
        if (alive && done !== null) {
          setSize({ width: node.width, height: node.height });
          setDirections(done);
          setStage('ready');
        }
      })
      .catch(() => {
        if (alive) setStage('failed');
      });
    return () => {
      alive = false;
    };
  }, [id, attempt, key, a]);

  return (
    <figure className={`m-0 ${className}`}>
      <div
        role="img"
        aria-label={label}
        className="relative w-full overflow-hidden bg-preview"
        style={{ aspectRatio: `${String(size.width)} / ${String(size.height)}` }}
      >
        <canvas
          ref={canvas}
          className={`absolute inset-0 size-full transition-opacity duration-500 ${stage === 'ready' ? 'opacity-100' : 'opacity-0'}`}
        />
        {stage === 'failed' ? (
          <div className="absolute inset-0 grid place-items-center p-6 text-center">
            <div className="flex flex-col items-center gap-3">
              <p className="m-0 text-sm text-ink-2">{failedLabel}</p>
              <button
                type="button"
                onClick={() => {
                  setStage('loading');
                  setAttempt((value) => value + 1);
                }}
                className="inline-flex h-9 items-center rounded-full border border-line-strong bg-surface px-4 text-xs font-medium text-ink hover:bg-elevated"
              >
                {retryLabel}
              </button>
            </div>
          </div>
        ) : null}
      </div>
      {proof && stage === 'ready' ? (
        <figcaption className="flex flex-wrap gap-1.5 pt-2.5">
          {directions.map((direction) => (
            <span
              key={direction.surfaceId}
              className="tabular inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 font-mono text-xs text-ink-2"
            >
              <span
                aria-hidden="true"
                className="size-2.5 rounded-full border border-line-strong"
                style={{ background: direction.background }}
              />
              {[
                direction.foil === undefined
                  ? t(`finish.${direction.finish}`)
                  : `${t(`finish.${direction.finish}`)} ${t(`foil.${direction.foil}`)}`,
                direction.paint ?? t('stock'),
                // Foil, relief and engraving take the logo's shape only, not its colours.
                ...(SHAPE_ONLY.has(direction.finish) ? [] : [t(`logo.${direction.logo}`)]),
              ].join(' · ')}
            </span>
          ))}
        </figcaption>
      ) : null}
    </figure>
  );
}
