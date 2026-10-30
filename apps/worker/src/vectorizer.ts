import type { TracedPath, Vectorizer } from '@app/contracts';
import { err, ok } from '@app/kernel';
import { ColorMode, Hierarchical, PathSimplifyMode, vectorizeRaw } from '@neplex/vectorizer';

// The Vectorizer of logo-kit (T-011), backed by vtracer (MIT). The mask comes already smoothed and
// enlarged; vtracer fits splines on it. Its output is parsed here and only the path data leaves.
const CONFIG = {
  colorMode: ColorMode.Binary,
  hierarchical: Hierarchical.Cutout,
  filterSpeckle: 4,
  colorPrecision: 6,
  layerDifference: 16,
  mode: PathSimplifyMode.Spline,
  cornerThreshold: 60,
  lengthThreshold: 4,
  maxIterations: 10,
  spliceThreshold: 45,
  pathPrecision: 2,
};
const PATH =
  /<path d="([^"]*)" fill="#000000" transform="translate\((-?[\d.]+(?:e-?\d+)?),(-?[\d.]+(?:e-?\d+)?)\)"\/>/gu;

export function createVtracer(): Vectorizer {
  return {
    trace: async (mask) => {
      // Ink is black on a white page: vtracer's binary mode traces the dark pixels.
      const pixels = Buffer.alloc(mask.width * mask.height * 4, 255);
      for (let index = 0; index < mask.data.length; index += 1)
        if (mask.data[index] === 1) pixels.fill(0, index * 4, index * 4 + 3);
      try {
        const svg = await vectorizeRaw(pixels, { width: mask.width, height: mask.height }, CONFIG);
        const paths: TracedPath[] = [...svg.matchAll(PATH)].map(
          ([, d = '', dx = '0', dy = '0']) => ({
            d: d.trim(),
            dx: Number(dx),
            dy: Number(dy),
          }),
        );
        return ok(paths);
      } catch (error) {
        return err({
          code: 'RASTER_FAILED',
          reason: error instanceof Error ? error.message : 'vtracer',
        });
      }
    },
  };
}
