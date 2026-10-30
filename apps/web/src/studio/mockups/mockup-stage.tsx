'use client';

import {
  createCompositor,
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
import { useEffect, useRef, useState } from 'react';
import type { BrandView } from '../workspace/brand-view';

// Computed mockups (ADR-008, 06_MOCKUP_ENGINE v2). Each scene is a photograph whose objects are painted in
// the brand's colours — their light, folds and grain kept — and on which the real logo file is projected
// with a physical finish (print, foil, emboss, embroidery…) by the WebGL2 compositor of mockup-engine. The
// art direction (which colour, finish and logo version per object) is mockup-engine's directScene. The
// logo is never redrawn by a model: its pixels are the uploaded file's or its vector variants'.
export const SCENES = [
  'place-cards',
  'stationery-flatlay',
  'menu-table',
  'napkin-plate',
  'paper-bag',
  'storefront-sign',
  'gift-box',
  'apron',
  'phone-table',
  'invitation',
] as const;
export type SceneId = (typeof SCENES)[number];

const cache = new Map<SceneId, Promise<LoadedScene | null>>();
function loadScene(id: SceneId): Promise<LoadedScene | null> {
  const known = cache.get(id);
  if (known !== undefined) return known;
  const loading = fetch(`/scenes/${id}/scene.json`)
    .then((response) => (response.ok ? response.json() : null))
    .then((json: unknown) => {
      const parsed = parseScene(json);
      return parsed.ok ? parsed.value : null;
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

async function renderScene(
  id: SceneId,
  view: BrandView,
  node: HTMLCanvasElement,
  alive: () => boolean,
): Promise<readonly SurfaceDirection[] | null> {
  const loaded = await loadScene(id);
  if (loaded === null) throw new Error('scene');
  const { scene, homographies } = loaded;
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

type Stage = 'loading' | 'ready' | 'failed';

export function MockupStage({
  scene: id,
  view,
  label,
  failedLabel,
  retryLabel,
  className = '',
}: {
  readonly scene: SceneId;
  readonly view: BrandView;
  readonly label: string;
  /** Shown when the scene or the logo cannot be loaded, with a retry. */
  readonly failedLabel: string;
  readonly retryLabel: string;
  readonly className?: string;
}) {
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
    renderScene(id, latest.current, node, () => alive)
      .then((done) => {
        if (alive && done !== null) setStage('ready');
      })
      .catch(() => {
        if (alive) setStage('failed');
      });
    return () => {
      alive = false;
    };
  }, [id, attempt, key]);

  return (
    <figure className={`m-0 ${className}`}>
      <div
        role="img"
        aria-label={label}
        className="relative aspect-[1920/1088] w-full overflow-hidden bg-preview"
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
    </figure>
  );
}
