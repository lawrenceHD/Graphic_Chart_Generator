'use client';

import { useRef, useState, type KeyboardEvent } from 'react';
import { pickObject } from './objects';
import type { SceneHits } from './scene-hits';

// The picture of a scene is a canvas; its objects are made selectable by this layer: a click picks the
// object under the pointer (by its mask), and every object is also a button for the keyboard and for
// assistive technology. The objects are one tab stop: arrows move between them, Enter or Space selects,
// Escape clears. The selected object is outlined; there is no other chrome on the picture.
export function SceneOverlay({
  sceneHits,
  size,
  selected,
  onSelect,
  labelOf,
  groupLabel,
}: {
  readonly sceneHits: SceneHits;
  readonly size: { readonly width: number; readonly height: number };
  readonly selected: string | null;
  readonly onSelect: (id: string | null) => void;
  readonly labelOf: (kind: 'surface' | 'paint', index: number) => string;
  readonly groupLabel?: string;
}) {
  const layer = useRef<HTMLDivElement>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const [focused, setFocused] = useState<number | null>(null);
  const objects = sceneHits.objects;
  const selectedIndex = objects.findIndex((object) => object.id === selected);
  // The tab stop: where focus last was, else the selected object, else the first.
  const stop = focused ?? (selectedIndex >= 0 ? selectedIndex : 0);

  const move = (to: number): void => {
    const count = objects.length;
    if (count === 0) return;
    const next = ((to % count) + count) % count;
    setFocused(next);
    buttons.current[next]?.focus();
  };
  const onKey = (event: KeyboardEvent<HTMLButtonElement>, index: number): void => {
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        move(index + 1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        move(index - 1);
        break;
      case 'Home':
        event.preventDefault();
        move(0);
        break;
      case 'End':
        event.preventDefault();
        move(objects.length - 1);
        break;
      case 'Escape':
        onSelect(null);
        break;
      default:
        break;
    }
  };

  return (
    <div
      ref={layer}
      role="group"
      aria-label={groupLabel}
      className="absolute inset-0 cursor-pointer"
      onPointerDown={(event) => {
        // The scene around the overlay selects itself on pointer down: left to run, it would replace the
        // object picked here by the scene alone.
        event.stopPropagation();
        const box = layer.current?.getBoundingClientRect();
        if (box === undefined || box.width === 0 || box.height === 0) return;
        const x = ((event.clientX - box.left) / box.width) * size.width;
        const y = ((event.clientY - box.top) / box.height) * size.height;
        onSelect(pickObject(sceneHits.hits, x, y));
      }}
    >
      {objects.map((object, index) => {
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
            ref={(node) => {
              buttons.current[index] = node;
            }}
            type="button"
            tabIndex={index === stop ? 0 : -1}
            aria-pressed={isSelected}
            aria-label={labelOf(object.kind, index)}
            onClick={() => {
              onSelect(object.id);
            }}
            onFocus={() => {
              setFocused(index);
            }}
            onKeyDown={(event) => {
              onKey(event, index);
            }}
            className={`pointer-events-none absolute m-0 border-0 bg-transparent p-0 outline-offset-2 focus-visible:outline-[3px] focus-visible:outline-ink focus-visible:shadow-[0_0_0_2px_#fff] ${isSelected ? 'outline-2 outline-ink' : 'outline-0'}`}
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
