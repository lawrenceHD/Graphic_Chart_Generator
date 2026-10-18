// Renders the 6 raster logos of the corpus (docs/05_ENGINES.md §6) from their SVG sources.
// Run once with `node tools/corpus/render.mjs`; the outputs are committed fixtures, not build artefacts.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const corpus = join(import.meta.dirname, '../../packages/svg-engine/fixtures/corpus');
const require = createRequire(join(import.meta.dirname, '../../packages/svg-engine/package.json'));
const { Resvg } = require('@resvg/resvg-js');
const sharp = require('sharp');

const WIDTH = 512;
const RASTERS = [
  { file: 'p01-hexa-transparent.png', source: 's05-hexa.svg', background: null, format: 'png' },
  { file: 'p02-aurora-transparent.png', source: 'g02-aurora.svg', background: null, format: 'png' },
  { file: 'w01-wave-white.png', source: 's04-wave.svg', background: '#FFFFFF', format: 'png' },
  {
    file: 'w02-outline-white.png',
    source: 't02-outline.svg',
    background: '#FFFFFF',
    format: 'png',
  },
  { file: 'j01-monogram.jpg', source: 's06-monogram.svg', background: '#FFFFFF', format: 'jpeg' },
  { file: 'j02-flare.jpg', source: 'g03-flare.svg', background: '#FFFFFF', format: 'jpeg' },
];

for (const { file, source, background, format } of RASTERS) {
  const svg = readFileSync(join(corpus, source), 'utf8');
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: WIDTH } }).render().asPng();
  let image = sharp(png);
  if (background !== null) image = image.flatten({ background });
  const bytes =
    format === 'png'
      ? await image.png({ compressionLevel: 9 }).toBuffer()
      : await image.jpeg({ quality: 82, chromaSubsampling: '4:2:0' }).toBuffer();
  writeFileSync(join(corpus, file), bytes);
  console.log(`${file} ← ${source} (${String(bytes.length)} octets)`);
}
