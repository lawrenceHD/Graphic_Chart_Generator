// Runs logos of the owner's private corpus (.cache/corpus-private, `pnpm corpus:fetch`) through the real
// engines (color-engine, logo-kit, svg-engine) and freezes the results in src/data/ (git-ignored: these are
// trademarks, never committed to the public repository). Needs `pnpm build` at the repository root.
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const repo = new URL('../../../', import.meta.url);
const corpus = new URL('.cache/corpus-private/', repo);
const load = (path) => import(new URL(`packages/${path}`, repo).href);
const color = await load('color-engine/dist/index.js');
const logoKit = await load('logo-kit/dist/index.js');
const svgEngine = await load('svg-engine/dist/index.js');
const raster = await load('svg-engine/dist/raster/index.js');
const rasterizer = raster.createNodeRasterizer();

// Demo brands (logo file, sector, brief, suggested open fonts) live in the private corpus: they name real
// trademarks, which never enter the public repository.
const BRANDS = JSON.parse(await readFile(new URL('prototype/brands.json', corpus), 'utf8'));

const unwrap = (result, what) => {
  if (!result.ok) throw new Error(`${what}: ${JSON.stringify(result.error)}`);
  return result.value;
};
// Naive indicative CMYK (the calibrated FOGRA39 conversion is T-010): shown as "indicatif" only.
const cmyk = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const k = 1 - Math.max(r, g, b);
  if (k >= 1) return [0, 0, 0, 100];
  return [r, g, b]
    .map((v) => Math.round(((1 - v - k) / (1 - k)) * 100))
    .concat(Math.round(k * 100));
};
const describe = (hex) => {
  const { L, C, h } = color.hexToOklch(hex);
  const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return { hex, rgb, oklch: [L, C, h ?? 0], cmyk: cmyk(hex) };
};
// Same steps as the asset.scan job: allowlist sanitizing, then a viewBox measured by the rasterizer.
const sanitize = async (file) => {
  const sanitized = unwrap(svgEngine.sanitizeSvg(await readFile(new URL(file, corpus))), file);
  return unwrap(await svgEngine.ensureViewBox(sanitized, rasterizer), `viewBox ${file}`);
};

const brands = [];
for (const brand of BRANDS) {
  const svg = await sanitize(brand.file);
  const rendered = await rasterizer.rasterize(svg, 400);
  if (!rendered.ok) {
    // Known: resvg panics on some PDF-extracted logos (geom.rs unwrap); the product rejects them too.
    console.warn(`skipped ${brand.slug}: ${rendered.error.reason}`);
    continue;
  }
  const image = rendered.value;
  const bbox = unwrap(await rasterizer.bbox(svg), 'bbox');
  const palette = unwrap(
    color.extractPalette({ width: image.width, height: image.height, data: image.rgba }),
    'extract',
  );
  const clusters = color.brandClusters(palette);
  const roles = color.assignRoles(clusters);
  const main = {
    primary: roles.primary,
    accent: roles.accent,
    neutralDark: roles.neutralDark,
    neutralLight: roles.neutralLight,
  };
  const pal = {
    primary: main.primary.hex,
    accent: main.accent.hex,
    neutralDark: main.neutralDark.hex,
    neutralLight: main.neutralLight.hex,
    extra: roles.extra.map((token) => token.hex),
  };
  const order = [pal.primary, pal.accent, pal.neutralLight, pal.neutralDark];
  const matrix = color.buildContrastMatrix(order);
  // The variant the product shows: plain drawing, or separated when it would lose the logo's structure.
  const mono = async (target) =>
    unwrap(await logoKit.monochromeVariant(svg, target, rasterizer), 'mono');
  const black = await mono('#000000');
  const white = await mono('#FFFFFF');
  // Without the presentation backdrop of a PDF extraction, as monochromeVariant does.
  const bare = unwrap(await logoKit.withoutBackdrop(svg, rasterizer), 'backdrop');
  const tonal = unwrap(logoKit.tonalSvg(bare, '#000000'), 'tonal');
  const { file: _file, note: _note, ...meta } = brand;
  brands.push({
    ...meta,
    logo: svg,
    bbox,
    extracted: clusters.map((c) => ({ hex: c.hex, share: Math.round(c.share * 1000) / 1000 })),
    roles: Object.fromEntries(
      Object.entries(main).map(([role, token]) => [
        role,
        { ...describe(token.hex), source: token.source },
      ]),
    ),
    extra: roles.extra.map((token) => describe(token.hex)),
    scales: {
      primary: color.buildScale(pal.primary).map((s) => ({ step: s.step, hex: s.hex })),
      accent: color.buildScale(pal.accent).map((s) => ({ step: s.step, hex: s.hex })),
    },
    contrast: matrix.cells.map((c) => ({
      text: c.text,
      background: c.background,
      ratio: Math.round(c.ratio * 100) / 100,
      level: c.level,
    })),
    mono: {
      black: black.svg,
      white: white.svg,
      tonal: tonal.svg,
      path: black.path,
      separated: black.separated,
      structure: black.structure,
    },
    clearSpace: unwrap(logoKit.clearSpaceDiagramSvg(svg, bbox, 0.25, '#F5F5F5'), 'clear space'),
    favicon: unwrap(logoKit.faviconSvg(svg, bbox, { background: pal.neutralLight }), 'favicon').svg,
    donts: unwrap(logoKit.dosAndDontsSvg(svg, bbox, pal), 'donts').map((panel) => ({
      kind: panel.kind,
      svg: panel.svg,
    })),
  });
  console.log(brand.slug.padEnd(12), order.join(' '), pal.extra.join(' '));
}

// Showcase wall of the landing: exemplary, flat, square library marks.
const catalog = JSON.parse(await readFile(new URL('library/catalog.json', corpus), 'utf8'));
const classes = new Map(
  JSON.parse(await readFile(new URL('library/classifications.json', corpus), 'utf8')).map((c) => [
    c.file,
    c,
  ]),
);
const wall = [];
for (const entry of catalog) {
  const kind = classes.get(entry.file);
  if (!kind?.exemplary || entry.gradients || entry.has_mask || entry.has_filter) continue;
  if (entry.aspect_class !== 'square' || entry.variant !== 'main') continue;
  const result = svgEngine.sanitizeSvg(
    await readFile(new URL(`library/svg/${entry.file}`, corpus)),
  );
  if (!result.ok) continue;
  // Light-only marks (white logos) get a dark tile, otherwise they vanish on the paper theme.
  const light =
    entry.colors.length > 0 &&
    entry.colors.every(
      (hex) => /^#[0-9a-f]{6}$/i.test(hex) && color.relativeLuminance(hex.toUpperCase()) > 0.6,
    );
  wall.push({
    name: entry.brand,
    svg: result.value.svg,
    colors: entry.colors,
    industry: kind.industry,
    dark: light,
  });
  if (wall.length === 48) break;
}

const data = new URL('../src/data/', import.meta.url);
await mkdir(data, { recursive: true });
await writeFile(new URL('brands.json', data), `${JSON.stringify(brands)}\n`);
await writeFile(new URL('wall.json', data), `${JSON.stringify(wall)}\n`);
console.log(`${String(brands.length)} brands, ${String(wall.length)} wall logos`);
