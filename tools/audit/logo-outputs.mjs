// Visual audit of the logo pages the generator produces today: renders every output of logo-kit for a few
// real logos onto one contact sheet per logo, so a human (or a design review) can judge them as a designer
// would. Usage, after `pnpm build`: node tools/audit/logo-outputs.mjs <out-dir> <logo.svg> [...]
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { basename, join } from 'node:path';
import {
  clearSpaceDiagramSvg,
  dosAndDontsSvg,
  faviconSvg,
  monochromeVariant,
  tonalSvg,
} from '../../packages/logo-kit/dist/index.js';
import { sanitizeSvg } from '../../packages/svg-engine/dist/index.js';
import { createNodeRasterizer } from '../../packages/svg-engine/dist/raster/index.js';

const require = createRequire(join(import.meta.dirname, '../../packages/svg-engine/package.json'));
const sharp = require('sharp');

const [outDir, ...logos] = process.argv.slice(2);
if (!outDir || logos.length === 0) {
  console.error('usage: node tools/audit/logo-outputs.mjs <out-dir> <logo.svg> [...]');
  process.exit(2);
}
mkdirSync(outDir, { recursive: true });
const rasterizer = createNodeRasterizer();
const TILE = 360;
const LABEL = 28;

async function tile(svg, label, background = '#E6E6E6') {
  const raster = await rasterizer.rasterize(svg, TILE - 40);
  const canvas = sharp({
    create: { width: TILE, height: TILE + LABEL, channels: 4, background },
  });
  const caption = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE}" height="${LABEL}"><rect width="100%" height="100%" fill="#FFFFFF"/><text x="8" y="19" font-family="Arial" font-size="14" fill="#222">${label}</text></svg>`,
  );
  const layers = [{ input: caption, top: TILE, left: 0 }];
  if (raster.ok) {
    const image = sharp(Buffer.from(raster.value.png));
    const meta = await image.metadata();
    const top = Math.max(0, Math.round((TILE - meta.height) / 2));
    layers.push({ input: await image.png().toBuffer(), top, left: 20 });
  } else {
    layers.push({
      input: Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE}" height="40"><text x="10" y="25" font-size="14" fill="#B00">${raster.error.code}</text></svg>`,
      ),
      top: TILE / 2,
      left: 0,
    });
  }
  return canvas.composite(layers).png().toBuffer();
}

for (const file of logos) {
  const name = basename(file, '.svg');
  const sanitized = sanitizeSvg(new Uint8Array(readFileSync(file)));
  if (!sanitized.ok) {
    console.log(`${name}: sanitize failed ${sanitized.error.code}`);
    continue;
  }
  const svg = sanitized.value.svg;
  const bbox = await rasterizer.bbox(svg);
  if (!bbox.ok) {
    console.log(`${name}: bbox failed`);
    continue;
  }
  const tiles = [await tile(svg, 'original', '#E6E6E6')];
  const notes = [];
  for (const [target, bg, label] of [
    ['#000000', '#FFFFFF', 'mono noir sur blanc'],
    ['#FFFFFF', '#1A1A1A', 'mono blanc sur noir'],
  ]) {
    const mono = await monochromeVariant(svg, target, rasterizer);
    if (mono.ok) {
      tiles.push(await tile(mono.value.svg, `${label} (${mono.value.drawing})`, bg));
      notes.push(
        `${label}: ${mono.value.drawing}, structure ${mono.value.structure}, ${mono.value.warnings.join(',')}`,
      );
    } else notes.push(`${label}: ${JSON.stringify(mono.error)}`);
  }
  const tonal = tonalSvg(svg, '#000000');
  if (tonal.ok) tiles.push(await tile(tonal.value.svg, 'tonal noir', '#FFFFFF'));
  const favicon = faviconSvg(svg, bbox.value);
  if (favicon.ok)
    tiles.push(await tile(favicon.value.svg, `favicon ${favicon.value.warnings.join(',')}`));
  const clear = clearSpaceDiagramSvg(svg, bbox.value, 0.25);
  if (clear.ok) tiles.push(await tile(clear.value, "zone d'exclusion 0.25", '#FFFFFF'));
  const donts = dosAndDontsSvg(svg, bbox.value, {
    primary: '#4A154B',
    accent: '#36C5F0',
    neutralLight: '#F4F4F4',
    neutralDark: '#1D1C1D',
    extra: [],
  });
  if (donts.ok) {
    for (const panel of donts.value)
      tiles.push(await tile(panel.svg, `interdit: ${panel.kind}`, panel.background ?? '#FFFFFF'));
  }
  const cols = 4;
  const rows = Math.ceil(tiles.length / cols);
  const sheet = await sharp({
    create: {
      width: cols * TILE,
      height: rows * (TILE + LABEL),
      channels: 4,
      background: '#FFFFFF',
    },
  })
    .composite(
      tiles.map((input, i) => ({
        input,
        left: (i % cols) * TILE,
        top: Math.floor(i / cols) * (TILE + LABEL),
      })),
    )
    .png()
    .toBuffer();
  writeFileSync(join(outDir, `${name}.png`), sheet);
  console.log(`${name}: ${tiles.length} tiles; ${notes.join(' | ')}`);
}
