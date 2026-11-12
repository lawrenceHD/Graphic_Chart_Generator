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
  type SurfaceChoices,
  type SurfaceDirection,
} from '@app/mockup-engine';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import type { BrandView } from '../workspace/brand-view';
import { drawArtwork, loadLogos, type ArtworkWords } from './artwork';
import { computedSlots, slotAspect, type ComputedSlot } from './curved-slots';
import { availableLogos } from './objects';
import { registerCanvas, unregisterCanvas } from './scene-export';
import { SceneOverlay } from './scene-overlay';
import { maskOf, photoHits, psdHits, rememberObjects, type SceneHits } from './scene-hits';
import { brandInks, loadImage, logoSource, logoTexture, renderKey } from './stage-assets';

export { brandInks, logoSource, renderKey };

// Computed mockups (ADR-008, 06_MOCKUP_ENGINE v2). Each scene is a photograph whose objects are painted in
// the brand's colours — their light, folds and grain kept — and on which the real logo file is projected
// with a physical finish (print, foil, emboss, embroidery…) by the WebGL2 compositor of mockup-engine. The
// art direction (which colour, finish and logo version per object) is mockup-engine's directScene. The
// logo is never redrawn by a model: its pixels are the uploaded file's or its vector variants'.
export const SCENES = [
  // The brand-mockup pack (Pinterest-grade photographs generated for hospitality, retail and studios).
  'blade-sign-street',
  'brochure-grey',
  'business-cards-sage',
  'laptop-desk',
  'mailer-box-blue',
  'notebook-flatlay',
  'poster-frame-console',
  'stationery-dark',
  'tote-terracotta',
  // Photoshop mockups by designers (Firmbee, CC0), replayed layer by layer (tools/psd-mockups/bake.py).
  'cards-floating',
  'a4-sheet',
  'cards-stack',
  'mug-white',
  // Generated photographs of the hospitality pack, where a centred mark is what the object wants.
  'place-cards',
  'menu-table',
  'storefront-sign',
  'gift-box',
  'paper-bag',
  'apron',
  'invitation',
  'napkin-plate',
  'phone-table',
  'stationery-flatlay',
] as const;
/** Judged weak: left out of the default order, their files and ids stay for the pages that still name them. */
export const RETIRED_SCENES = [
  'poster-living',
  'poster-held',
  'poster-hanging',
  'mug-stripes',
] as const;
export type SceneId = (typeof SCENES)[number] | (typeof RETIRED_SCENES)[number];

type AnyScene =
  | { readonly kind: 'photo'; readonly loaded: LoadedScene }
  | {
      readonly kind: 'psd';
      readonly scene: PsdScene;
      /** Slots whose UV map is computed from their geometry (ADR-034). */
      readonly slots: ReadonlyMap<string, ComputedSlot>;
    };
const cache = new Map<SceneId, Promise<AnyScene | null>>();
/** Why the last load of a scene failed, for the error the stage reports. */
const failures = new Map<SceneId, string>();
function loadScene(id: SceneId): Promise<AnyScene | null> {
  const known = cache.get(id);
  if (known !== undefined) return known;
  const loading = fetch(`/scenes/${id}/scene.json`)
    .then((response) => {
      if (response.ok) return response.json();
      failures.set(id, `scene ${id}: scene.json answered ${String(response.status)}`);
      return null;
    })
    .then((json: unknown): AnyScene | null => {
      if (json === null) return null;
      const psd = PsdSceneSchema.safeParse(json);
      if (psd.success) {
        const slots = computedSlots(psd.data);
        if (slots.ok) return { kind: 'psd', scene: psd.data, slots: slots.value };
        failures.set(id, `scene ${id}: slot geometry refused, ${slots.error}`);
        return null;
      }
      const parsed = parseScene(json);
      if (parsed.ok) return { kind: 'photo', loaded: parsed.value };
      failures.set(id, `scene ${id}: ${parsed.error.issues.join('; ')}`);
      return null;
    })
    .catch((error: unknown) => {
      failures.set(id, `scene ${id}: ${error instanceof Error ? error.message : 'load failed'}`);
      return null;
    })
    .then((loaded) => {
      // A failure is not remembered: the next stage asks again (a network blip must not hide a scene).
      if (loaded === null) cache.delete(id);
      return loaded;
    });
  cache.set(id, loading);
  return loading;
}

const PAINT_ORDER = ['primary', 'accent', 'neutralLight', 'neutralDark'] as const;

/** A Photoshop mockup: its layers replayed, the brand's artwork in every slot, its fields painted. */
async function renderPsd(
  id: SceneId,
  scene: PsdScene,
  slots: ReadonlyMap<string, ComputedSlot>,
  view: BrandView,
  words: ArtworkWords,
  node: HTMLCanvasElement,
  alive: () => boolean,
  choices: SurfaceChoices,
): Promise<readonly SurfaceDirection[] | null> {
  const file = (name: string) => loadImage(`/scenes/${id}/${name}`);
  const logos = await loadLogos(view);
  const layers: PsdRenderLayer[] = [];
  let field = 0;
  for (const layer of scene.layers) {
    if (layer.type === 'image') {
      layers.push({
        kind: 'image',
        image: await file(layer.src),
        mode: BLEND_CODES[layer.blend],
        opacity: layer.opacity,
      });
    } else if (layer.type === 'paint') {
      const chosen = choices[`field-${String(field)}`]?.paint;
      field += 1;
      const role =
        chosen !== undefined && chosen !== 'none'
          ? chosen
          : (PAINT_ORDER.find((entry) => layer.paint.includes(entry)) ?? 'neutralLight');
      layers.push({
        kind: 'paint',
        mask: await file(layer.mask),
        color: view.colors[role],
        opacity: layer.opacity,
      });
    } else {
      const artwork = drawArtwork(layer.role, slotAspect(layer, slots), view, logos, words);
      const computed = slots.get(layer.id);
      if (computed !== undefined) {
        layers.push({
          kind: 'mesh-slot',
          mesh: computed.mesh,
          artwork: await artwork,
          mode: BLEND_CODES[layer.blend],
          opacity: layer.opacity,
        });
        continue;
      }
      if (layer.uv === undefined || layer.vv === undefined) {
        throw new Error(`scene ${id}: slot ${layer.id} has neither baked maps nor a geometry`);
      }
      const [u, v, drawn] = await Promise.all([file(layer.uv), file(layer.vv), artwork]);
      layers.push({
        kind: 'slot',
        u,
        v,
        artwork: drawn,
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
  choices: SurfaceChoices,
): Promise<readonly SurfaceDirection[] | null> {
  const any = await loadScene(id);
  if (any === null) throw new Error(failures.get(id) ?? `scene ${id} could not be loaded`);
  if (any.kind === 'psd')
    return renderPsd(id, any.scene, any.slots, view, words, node, alive, choices);
  const { scene, homographies } = any.loaded;
  const directions = directScene(
    scene,
    view.colors,
    brandInks(view),
    choices,
    availableLogos(view.logo),
  );
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

const hitsCache = new Map<SceneId, Promise<SceneHits | null>>();
/** The selectable objects of a scene and what lies under a point (masks read once per scene). */
function hitsOf(id: SceneId): Promise<SceneHits | null> {
  const known = hitsCache.get(id);
  if (known !== undefined) return known;
  const loadMask = (file: string) =>
    loadImage(`/scenes/${id}/${file}`)
      .then(maskOf)
      .catch(() => null);
  const loading = loadScene(id)
    .then((any) => {
      if (any === null) return null;
      return any.kind === 'psd'
        ? psdHits(any.scene, loadMask)
        : photoHits(any.loaded.scene, loadMask);
    })
    .catch(() => null)
    .then((found) => {
      if (found === null) hitsCache.delete(id);
      else rememberObjects(id, found.objects);
      return found;
    });
  hitsCache.set(id, loading);
  return loading;
}

const NO_CHOICES: SurfaceChoices = {};
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
  pick,
  choices = NO_CHOICES,
  onDirected,
}: {
  readonly choices?: SurfaceChoices;
  /** Told what the art direction applied to each object once the picture is drawn. */
  readonly onDirected?: (scene: SceneId, directions: readonly SurfaceDirection[]) => void;
  readonly scene: SceneId;
  readonly view: BrandView;
  readonly label: string;
  /** Shown when the scene or the logo cannot be loaded, with a retry. */
  readonly failedLabel: string;
  readonly retryLabel: string;
  readonly className?: string;
  /** Show the art direction applied under the picture (finish, colour, logo version). */
  readonly proof?: boolean;
  /** Makes the objects of the picture selectable (the studio canvas); absent on guideline pages. */
  readonly pick?: {
    readonly selected: string | null;
    readonly onSelect: (id: string | null) => void;
    readonly labelOf: (kind: 'surface' | 'paint', number: number) => string;
    readonly groupLabel: string;
  };
}) {
  const t = useTranslations('workspace.proof');
  const a = useTranslations('workspace.artwork');
  const [size, setSize] = useState({ width: 1920, height: 1088 });
  const [directions, setDirections] = useState<readonly SurfaceDirection[]>([]);
  const canvas = useRef<HTMLCanvasElement>(null);
  const latest = useRef(view);
  const [stage, setStage] = useState<Stage>('loading');
  const [failure, setFailure] = useState<string | null>(null);
  const [sceneHits, setSceneHits] = useState<SceneHits | null>(null);
  const [attempt, setAttempt] = useState(0);
  const key = `${renderKey(view)}#${JSON.stringify(choices)}`;
  const latestChoices = useRef(choices);
  const told = useRef(onDirected);
  const interactive = pick !== undefined;
  // Only the stage the person directs is exported; a plain copy of the scene on a charter page is not.
  const exported = useRef(interactive);

  useEffect(() => {
    latest.current = view;
    latestChoices.current = choices;
    told.current = onDirected;
    exported.current = interactive;
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
    renderScene(id, latest.current, words, node, () => alive, latestChoices.current)
      .then((done) => {
        if (alive && done !== null) {
          if (exported.current) registerCanvas(id, node);
          told.current?.(id, done);
          setSize({ width: node.width, height: node.height });
          setDirections(done);
          setStage('ready');
        }
      })
      .catch((error: unknown) => {
        if (!alive) return;
        // The reason stays readable on the figure (data-failure) for QA; the person sees the retry.
        setFailure(error instanceof Error ? error.message : 'render failed');
        setStage('failed');
      });
    return () => {
      alive = false;
      unregisterCanvas(id, node);
    };
  }, [id, attempt, key, a]);

  useEffect(() => {
    if (!interactive || stage !== 'ready') return;
    let alive = true;
    void hitsOf(id).then((found) => {
      if (alive) setSceneHits(found);
    });
    return () => {
      alive = false;
    };
  }, [id, stage, interactive]);

  return (
    <figure
      className={`m-0 ${className}`}
      data-failure={stage === 'failed' ? (failure ?? undefined) : undefined}
    >
      <div
        className="relative w-full overflow-hidden bg-preview"
        style={{ aspectRatio: `${String(size.width)} / ${String(size.height)}` }}
      >
        <canvas
          ref={canvas}
          role="img"
          aria-label={label}
          className={`absolute inset-0 size-full transition-opacity duration-500 ${stage === 'ready' ? 'opacity-100' : 'opacity-0'}`}
        />
        {pick !== undefined && sceneHits !== null && stage === 'ready' ? (
          <SceneOverlay
            sceneHits={sceneHits}
            size={size}
            selected={pick.selected}
            onSelect={pick.onSelect}
            labelOf={pick.labelOf}
            groupLabel={pick.groupLabel}
          />
        ) : null}
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
