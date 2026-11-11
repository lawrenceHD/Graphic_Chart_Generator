// @vitest-environment jsdom
import { unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { registerCanvas, renderedScenes, unregisterCanvas, zipScenes } from './scene-export';

describe('exporting the scenes', () => {
  it('puts every picture in one zip under its own name, bytes untouched', () => {
    const first = new Uint8Array([137, 80, 78, 71, 1]);
    const second = new Uint8Array([137, 80, 78, 71, 2]);
    const zip = zipScenes([
      { name: 'la-meza-mug-white.png', bytes: first },
      { name: 'la-meza-a4-sheet.png', bytes: second },
    ]);
    const files = unzipSync(zip);
    expect(Object.keys(files).sort()).toEqual(['la-meza-a4-sheet.png', 'la-meza-mug-white.png']);
    expect(files['la-meza-mug-white.png']).toEqual(first);
    expect(files['la-meza-a4-sheet.png']).toEqual(second);
  });

  it('keeps two pictures of the same name apart instead of overwriting one', () => {
    const files = unzipSync(
      zipScenes([
        { name: 'x.png', bytes: new Uint8Array([1]) },
        { name: 'x.png', bytes: new Uint8Array([2]) },
      ]),
    );
    expect(Object.keys(files).sort()).toEqual(['x-2.png', 'x.png']);
  });

  it('knows which stages have a finished picture, and forgets a stage that unmounts', () => {
    const canvas = document.createElement('canvas');
    registerCanvas('mug-white', canvas);
    expect(renderedScenes()).toEqual(['mug-white']);
    unregisterCanvas('mug-white', canvas);
    expect(renderedScenes()).toEqual([]);
  });

  it('is not emptied by another stage of the same scene that unmounts', () => {
    const edited = document.createElement('canvas');
    const other = document.createElement('canvas');
    registerCanvas('mug-white', edited);
    unregisterCanvas('mug-white', other);
    expect(renderedScenes()).toEqual(['mug-white']);
    unregisterCanvas('mug-white', edited);
    expect(renderedScenes()).toEqual([]);
  });
});
