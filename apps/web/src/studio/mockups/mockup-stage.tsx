'use client';

import { parseScene, placeLogo, type Homography, type LoadedScene } from '@app/mockup-engine';
import { useEffect, useRef, useState } from 'react';
import type { BrandView } from '../workspace/brand-view';
import { useImageAspect } from '../pages/sheet';

// Computed mockups (ADR-008, 06_MOCKUP_ENGINE): the real logo file is projected onto a photographed surface
// with the homography of mockup-engine, as a CSS matrix3d, and blended (multiply) so the photo's folds and light
// shade it. The logo is never redrawn by a model: its pixels are the uploaded file's.
export const SCENES = [
  'business-card',
  'shop-sign',
  'tote-bag',
  't-shirt-folded',
  'reception-wall',
  'framed-poster',
  'laptop-screen',
] as const;
export type SceneId = (typeof SCENES)[number];

const UNIT = 1000;
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
    .catch(() => null);
  cache.set(id, loading);
  return loading;
}

/** CSS matrix3d of the unit square (drawn as a UNIT × UNIT box) onto the scene quad. */
export function cssMatrix(h: Homography): string {
  const s = UNIT;
  const values = [
    h[0] / s,
    h[3] / s,
    0,
    h[6] / s,
    h[1] / s,
    h[4] / s,
    0,
    h[7] / s,
    0,
    0,
    1,
    0,
    h[2],
    h[5],
    0,
    h[8],
  ];
  return `matrix3d(${values.map((value) => value.toPrecision(10)).join(',')})`;
}

function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const node = ref.current;
    if (node === null) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry !== undefined) setWidth(entry.contentRect.width);
    });
    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, []);
  return [ref, width];
}

export function MockupStage({
  scene: id,
  view,
  label,
  className = '',
}: {
  readonly scene: SceneId;
  readonly view: BrandView;
  readonly label: string;
  readonly className?: string;
}) {
  const [scene, setScene] = useState<LoadedScene | null>(null);
  const [failed, setFailed] = useState(false);
  const [ref, width] = useWidth<HTMLDivElement>();
  const surface = scene?.scene.surfaces[0];
  const dark =
    surface === undefined ? false : surface.baseTint.reduce((a, b) => a + b, 0) / 3 < 0.42;
  const logo = dark ? (view.logo['mono-white'] ?? view.logo.color) : view.logo.color;
  const aspect = useImageAspect(logo);

  useEffect(() => {
    let alive = true;
    void loadScene(id).then((loaded) => {
      if (!alive) return;
      setScene(loaded);
      setFailed(loaded === null);
    });
    return () => {
      alive = false;
    };
  }, [id]);

  const size = scene?.scene.size ?? { width: 16, height: 9 };
  const h = surface === undefined ? undefined : scene?.homographies.get(surface.id);
  const rect = surface !== undefined && aspect !== null ? placeLogo(surface.logoBox, aspect) : null;
  const scale = width / size.width;

  return (
    <figure className={`m-0 ${className}`}>
      <div
        ref={ref}
        role="img"
        aria-label={label}
        className="relative w-full overflow-hidden bg-preview"
        style={{ aspectRatio: `${String(size.width)} / ${String(size.height)}` }}
      >
        {failed ? null : (
          <div
            className="absolute top-0 left-0 origin-top-left"
            style={{ width: size.width, height: size.height, transform: `scale(${String(scale)})` }}
          >
            {/* Scene photographs of the free catalogue (FLUX.2 klein, Apache-2.0, LICENSE.md beside each). */}
            <img
              src={`/scenes/${id}/base.webp`}
              alt=""
              draggable={false}
              className="absolute inset-0 size-full"
            />
            {h !== undefined && rect?.ok === true ? (
              <div
                className="absolute top-0 left-0 origin-top-left"
                style={{ width: UNIT, height: UNIT, transform: cssMatrix(h) }}
              >
                <img
                  src={logo}
                  alt=""
                  draggable={false}
                  className="absolute"
                  style={{
                    left: rect.value.u0 * UNIT,
                    top: rect.value.v0 * UNIT,
                    width: (rect.value.u1 - rect.value.u0) * UNIT,
                    height: (rect.value.v1 - rect.value.v0) * UNIT,
                    objectFit: 'fill',
                    mixBlendMode: dark ? 'screen' : 'multiply',
                    opacity: 0.94,
                  }}
                />
              </div>
            ) : null}
          </div>
        )}
      </div>
    </figure>
  );
}
