import { zipSync } from 'fflate';
import { download } from '../workspace/export-files';
import { exportFileName } from './objects';

// Export of the mockup pictures: the PNG the compositor drew, one at a time or all at once in a zip.
// The stages register their canvas when a picture is finished, so what is exported is what is on screen.
const canvases = new Map<string, HTMLCanvasElement>();

export function registerCanvas(scene: string, canvas: HTMLCanvasElement | null): void {
  if (canvas === null) canvases.delete(scene);
  else canvases.set(scene, canvas);
}

/** Scenes whose picture is finished, in the order the stages finished. */
export const renderedScenes = (): readonly string[] => [...canvases.keys()];

function pngOf(canvas: HTMLCanvasElement): Promise<Uint8Array | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob === null) {
        resolve(null);
        return;
      }
      void blob.arrayBuffer().then((buffer) => {
        resolve(new Uint8Array(buffer));
      });
    }, 'image/png');
  });
}

export interface SceneFile {
  readonly name: string;
  readonly bytes: Uint8Array;
}

/** A zip of PNG files (already compressed: stored, not deflated twice). Same names never overwrite. */
export function zipScenes(files: readonly SceneFile[]): Uint8Array {
  const entries: Record<string, Uint8Array> = {};
  for (const file of files) {
    let name = file.name;
    for (let n = 2; name in entries; n += 1)
      name = file.name.replace(/\.png$/u, `-${String(n)}.png`);
    entries[name] = file.bytes;
  }
  return zipSync(entries, { level: 0 });
}

/** Downloads one scene as a PNG; false when its picture is not finished or cannot be encoded. */
export async function exportScenePng(brand: string, scene: string): Promise<boolean> {
  const canvas = canvases.get(scene);
  if (canvas === undefined) return false;
  const bytes = await pngOf(canvas);
  if (bytes === null) return false;
  download(exportFileName(brand, scene), bytes, 'image/png');
  return true;
}

/** Downloads every finished scene in one zip; returns how many pictures it holds. */
export async function exportScenesZip(brand: string): Promise<number> {
  const files: SceneFile[] = [];
  for (const [scene, canvas] of canvases) {
    const bytes = await pngOf(canvas);
    if (bytes !== null) files.push({ name: exportFileName(brand, scene), bytes });
  }
  if (files.length === 0) return 0;
  const stem = exportFileName(brand, 'mockups').replace(/\.png$/u, '');
  download(`${stem}.zip`, zipScenes(files), 'application/zip');
  return files.length;
}
