'use client';

import { useRef } from 'react';
import { pickObject } from './objects';
import type { SceneHits } from './scene-hits';

// The picture of a scene is a canvas; its objects are made selectable by this layer: a click picks the
// object under the pointer (by its mask), and every object is also a button for the keyboard and for
// assistive technology. The selected object is outlined; there is no other chrome on the picture.
export function SceneOverlay({
  sceneHits,
  size,
  selected,
  onSelect,
  labelOf,
}: {
  readonly sceneHits: SceneHits;
  readonly size: { readonly width: number; readonly height: number };
  readonly selected: string | null;
  readonly onSelect: (id: string | null) => void;
  readonly labelOf: (kind: 'surface' | 'paint', index: number) => string;
}) {
  const layer = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={layer}
      className="absolute inset-0 cursor-pointer"
      onPointerDown={(event) => {
        const box = layer.current?.getBoundingClientRect();
        if (box === undefined || box.width === 0 || box.height === 0) return;
        const x = ((event.clientX - box.left) / box.width) * size.width;
        const y = ((event.clientY - box.top) / box.height) * size.height;
        onSelect(pickObject(sceneHits.hits, x, y));
      }}
    >
      {sceneHits.objects.map((object, index) => {
        const points = object.outline;
        if (points === null) return null;
        const xs = points.map(([x]) => x);
        const ys = points.map(([, y]) => y);
        const left = Math.min(...xs);
        const top = Math.min(...ys);
        const isSelected = selected === object.id;
        return (
          <button
            key={object.id}
            type="button"
            aria-pressed={isSelected}
            aria-label={labelOf(object.kind, index)}
            onClick={() => {
              onSelect(object.id);
            }}
            className={`pointer-events-none absolute m-0 border-0 bg-transparent p-0 outline-offset-2 focus-visible:outline-2 focus-visible:outline-ink ${isSelected ? 'outline-2 outline-ink' : 'outline-0'}`}
            style={{
              left: `${String((left / size.width) * 100)}%`,
              top: `${String((top / size.height) * 100)}%`,
              width: `${String(((Math.max(...xs) - left) / size.width) * 100)}%`,
              height: `${String(((Math.max(...ys) - top) / size.height) * 100)}%`,
            }}
          />
        );
      })}
    </div>
  );
}
