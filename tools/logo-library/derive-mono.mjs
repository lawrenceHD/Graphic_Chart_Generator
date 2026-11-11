// Derives the white and black one-colour files of the sixteen demo logos with logo-kit's monochrome engine
// (the mark is recoloured, never redrawn). Usage: node tools/logo-library/derive-mono.mjs
// Needs the packages built (pnpm --filter @app/logo-kit --filter @app/svg-engine build).
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { monochromeVariant } from '../../packages/logo-kit/dist/index.js';
import { sanitizeSvg } from '../../packages/svg-engine/dist/index.js';
import { createNodeRasterizer } from '../../packages/svg-engine/dist/raster/index.js';

const DIR = join(import.meta.dirname, '../../apps/web/public/demo/logos');
const OUT = join(DIR, 'mono');
mkdirSync(OUT, { recursive: true });
const rasterizer = createNodeRasterizer();
const report = [];
for (const file of readdirSync(DIR).filter((f) => f.endsWith('.svg'))) {
  const id = file.slice(0, -4);
  const clean = sanitizeSvg(readFileSync(join(DIR, file)));
  if (!clean.ok) {
    report.push(`${id}: sanitize ${clean.error.code}`);
    continue;
  }
  for (const [tone, target] of [
    ['white', '#FFFFFF'],
    ['black', '#000000'],
  ]) {
    const made = await monochromeVariant(clean.value.svg, target, rasterizer);
    if (!made.ok || made.value.path !== 'structural') {
      report.push(`${id}-${tone}: not derived (${made.ok ? made.value.path : made.error.code})`);
      continue;
    }
    writeFileSync(join(OUT, `${id}-${tone}.svg`), made.value.svg);
    report.push(
      `${id}-${tone}: ${made.value.drawing} structure=${made.value.structure} ${made.value.warnings.join(',')}`,
    );
  }
}
console.log(report.join('\n'));
