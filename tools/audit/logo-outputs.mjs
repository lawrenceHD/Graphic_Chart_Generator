// Visual audit of the logo pages the generator produces today: renders every output of logo-kit for a few
// real logos onto one contact sheet per logo, so a human (or a design review) can judge them as a designer
// would. Usage, after `pnpm build`: node tools/audit/logo-outputs.mjs <out-dir> <logo.svg> [...]
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { basename, join } from 'node:path';
import {
  backgroundBoard,
  clearSpacePlateSvg,
  dosAndDontsSvg,
  faviconSvg,
  logoVersions,
  measureLogo,
  monochromeVariant,
} from '../../packages/logo-kit/dist/index.js';
import { assignRoles, extractPalette } from '../../packages/color-engine/dist/index.js';
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
// French captions of the misuse grid, imperative as in the real charters (R8).
const VERSION_FR = {
  colour: 'A. Version principale',
  negative: 'B. Négatif sur couleur de marque',
  black: 'C. Noir',
  white: 'D. Blanc sur fond sombre',
};
const BACKGROUND_FR = {
  light: 'Fond clair',
  dark: 'Fond sombre',
  brand: 'Couleur de marque',
  'photo-light': 'Photo claire',
  'photo-dark': 'Photo sombre',
  forbidden: 'Interdit :',
};
const DONT_FR = {
  distort: 'Ne pas étirer',
  squash: 'Ne pas écraser',
  rotate: 'Ne pas pivoter',
  recolor: 'Ne pas changer les couleurs',
  'partial-recolor': 'Ne pas recolorer une partie',
  outline: 'Ne pas utiliser en contour',
  shadow: 'Ne pas ajouter d’effet',
  transparency: 'Ne pas rendre transparent',
  'bad-background': 'Pas de fond peu contrasté',
  'busy-background': 'Pas de fond chargé',
  crop: 'Ne pas recadrer',
  crowd: 'Respecter la zone de protection',
};
const LABEL = 28;

// `overlay(scale, top)` returns SVG text in tile pixels: labels the page sets over a sanitized drawing.
async function tile(svg, label, background = '#E6E6E6', { width = TILE - 40, overlay } = {}) {
  const raster = await rasterizer.rasterize(svg, width);
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
    const left = Math.round((TILE - meta.width) / 2);
    layers.push({ input: await image.png().toBuffer(), top, left });
    if (overlay)
      layers.push({
        input: Buffer.from(
          `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE}" height="${TILE}">${overlay(meta.width, left, top)}</svg>`,
        ),
        top: 0,
        left: 0,
      });
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
  // The logo's own palette, as the generator extracts it, so that every page uses the real colours.
  const raster = await rasterizer.rasterize(svg, 256);
  const extracted = raster.ok
    ? extractPalette({
        width: raster.value.width,
        height: raster.value.height,
        data: raster.value.rgba,
      })
    : undefined;
  if (!extracted?.ok) {
    console.log(`${name}: palette extraction failed`);
    continue;
  }
  const roles = assignRoles(extracted.value.clusters);
  const palette = {
    primary: roles.primary.hex,
    accent: roles.accent.hex,
    neutralLight: roles.neutralLight.hex,
    neutralDark: roles.neutralDark.hex,
    extra: roles.extra.map((token) => token.hex),
  };
  const logoColours = extracted.value.clusters.filter((c) => c.share >= 0.05).map((c) => c.hex);
  const notes = [
    `palette ${palette.primary}/${palette.accent}/${palette.neutralLight}/${palette.neutralDark}`,
  ];
  const drawings = { colour: svg };
  for (const [version, target] of [
    ['black', '#000000'],
    ['white', '#FFFFFF'],
  ]) {
    const mono = await monochromeVariant(svg, target, rasterizer);
    if (mono.ok) {
      drawings[version] = mono.value.svg;
      notes.push(`${version}: ${mono.value.drawing} ${mono.value.structure.toFixed(2)}`);
    } else notes.push(`${version}: ${JSON.stringify(mono.error)}`);
  }
  const tiles = [];
  // R5: versions, each on the background it is made for.
  // A version whose drawing failed is reported in the notes and left out, never drawn from another.
  for (const spec of logoVersions(palette).filter((v) => drawings[v.version]))
    tiles.push(await tile(drawings[spec.version], `${VERSION_FR[spec.key]}`, spec.background));
  // R9: usage on backgrounds, the photo ones shown on their representative tone.
  for (const usage of backgroundBoard(palette, logoColours).filter((u) => drawings[u.version]))
    tiles.push(
      await tile(
        drawings[usage.version],
        `${BACKGROUND_FR[usage.kind]} ${usage.contrast.toFixed(1)}:1`,
        usage.background,
      ),
    );
  // R6, R7: plate with the real reference element, labels set as the page will set them.
  const measured = await measureLogo(svg, rasterizer);
  if (measured.ok) {
    const plate = clearSpacePlateSvg(svg, measured.value);
    if (plate.ok) {
      const [vx, vy, vw] = plate.value.viewBox;
      const x = measured.value.clearSpace.x;
      const overlay = (pixels, left, top) => {
        const scale = pixels / vw;
        return plate.value.labels
          .map(
            (label) =>
              `<text x="${left + (label.x - vx) * scale}" y="${top + (label.y - vy) * scale}" font-family="Georgia" font-style="italic" font-size="${Math.max(11, x * 0.6 * scale)}" text-anchor="middle" dominant-baseline="central" fill="#000">x</text>`,
          )
          .join('');
      };
      tiles.push(
        await tile(
          plate.value.svg,
          `zone : x = ${measured.value.clearSpace.source === 'element' ? 'élément du logo' : 'convention 0,25 H'}`,
          '#FFFFFF',
          { overlay },
        ),
      );
    }
    const { minimum } = measured.value;
    tiles.push(
      await tile(
        svg,
        `taille min. ${minimum.widthPx} px / ${String(minimum.widthMm).replace('.', ',')} mm (rendu réel)`,
        '#FFFFFF',
        { width: minimum.widthPx },
      ),
    );
  }
  // R5 E: the symbol alone for the favicon and small sizes, when the logo is a lockup.
  const symbol = measured.ok ? measured.value.symbol : undefined;
  const favicon = faviconSvg(svg, symbol ?? bbox.value, symbol ? { crop: true } : {});
  if (favicon.ok)
    tiles.push(
      await tile(
        favicon.value.svg,
        symbol
          ? 'E. Symbole seul (favicon)'
          : `favicon, logo entier ${favicon.value.warnings.join(',')}`,
      ),
    );
  const donts = dosAndDontsSvg(svg, bbox.value, palette);
  if (donts.ok) {
    for (const panel of donts.value)
      tiles.push(await tile(panel.svg, DONT_FR[panel.kind] ?? panel.kind, panel.background));
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
