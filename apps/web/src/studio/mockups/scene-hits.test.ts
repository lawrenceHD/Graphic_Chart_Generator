import type { PsdScene } from '@app/contracts';
import { describe, expect, it, vi } from 'vitest';
import { objectsOfScene, psdHits, rememberObjects, subscribeObjects } from './scene-hits';

const psd: PsdScene = {
  id: 'cards',
  kind: 'psd',
  schemaVersion: 3,
  size: { width: 4, height: 4 },
  layers: [
    { type: 'paint', mask: 'mask-0.png', paint: ['neutralLight'], opacity: 1 },
    { type: 'paint', mask: 'mask-1.png', paint: ['primary'], opacity: 1 },
    { type: 'paint', mask: 'mask-2.png', paint: ['accent'], opacity: 1 },
  ],
};

const lit = { width: 4, height: 4, data: new Uint8ClampedArray(16).fill(255) };

describe('psdHits', () => {
  it('keeps the number of each colour field when a mask before it fails to load', async () => {
    const found = await psdHits(psd, (file) => Promise.resolve(file === 'mask-1.png' ? null : lit));
    expect(found.objects.map((object) => [object.id, object.number])).toEqual([
      ['field-0', 1],
      ['field-2', 3],
    ]);
  });
});

describe('the objects of a scene', () => {
  it('tells its listeners when the stage has measured them', () => {
    const listener = vi.fn();
    const stop = subscribeObjects(listener);
    rememberObjects('cards-late', []);
    expect(listener).toHaveBeenCalledTimes(1);
    stop();
    rememberObjects('cards-late', []);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(objectsOfScene('cards-late')).toEqual([]);
  });
});
