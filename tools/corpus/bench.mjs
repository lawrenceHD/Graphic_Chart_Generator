// Quantified bench of the logo pipeline on the owner's private corpus (`pnpm corpus:fetch`, then `pnpm build`).
// Usage: node tools/corpus/bench.mjs <label> [--sample N] (default 160 of the 1 432 library SVGs; --sample all)
// Writes reports/<date>-<label>/{results.json,summary.md} inside the private corpus: results name real brands,
// so they never go to this public repository. Measures, does not judge: the summary is read before/after a fix.
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';

const root = join(import.meta.dirname, '../..');
const corpus = join(root, '.cache/corpus-private');
// BENCH_ENGINE: another checkout's built packages (e.g. a worktree of an older commit) for before/after.
const engine = process.env.BENCH_ENGINE ?? root;
const imp = (path) => import(pathToFileURL(join(engine, path)).href);
const { extractPalette, assignRoles, brandClusters, deltaEOk } = await imp(
  'packages/color-engine/dist/index.js',
);
const { sanitizeSvg, downscaleNearest } = await imp('packages/svg-engine/dist/index.js');
const { normalizeRaster } = await imp('packages/svg-engine/dist/raster/index.js');
const { monochromeSvg, fidelityScore } = await imp('packages/logo-kit/dist/index.js');
const require = createRequire(join(engine, 'packages/svg-engine/package.json'));
const { Resvg } = require('@resvg/resvg-js');
const sharp = require('sharp');

const [label = 'run', ...flags] = process.argv.slice(2);
const sampleAt = flags.indexOf('--sample');
const sampleArg = sampleAt === -1 ? '160' : flags[sampleAt + 1];
const sampleSize = sampleArg === 'all' ? Infinity : Number(sampleArg);

const WIDTH = 512; // §2.4: palette input is at most 512 px
const MATCH = 0.05; // ΔE_OK under which an extracted cluster "is" a reference colour
const STRICT = 0.02;
const VISIBLE = 0.01; // a reference colour covering ≥ 1 % of the logo must be found

/** In-process twin of svg-engine/src/raster/child.ts (same resvg options, straight alpha): no child per call. */
function render(svg, width) {
  const image = new Resvg(svg, {
    font: { loadSystemFonts: false },
    logLevel: 'off',
    fitTo: { mode: 'width', value: width },
  }).render();
  const rgba = new Uint8Array(image.pixels);
  for (let offset = 0; offset < rgba.length; offset += 4) {
    const alpha = rgba[offset + 3];
    if (alpha === 0 || alpha === 255) continue;
    for (let channel = 0; channel < 3; channel += 1) {
      rgba[offset + channel] = Math.min(255, Math.round((rgba[offset + channel] * 255) / alpha));
    }
  }
  return { width: image.width, height: image.height, rgba, png: image.asPng() };
}
const rasterizer = { rasterize: async (svg, width) => ({ ok: true, value: render(svg, width) }) };

const hexOf = (rgba, offset) =>
  '#' +
  [0, 1, 2]
    .map((c) => rgba[offset + c].toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
const norm = (hex) => '#' + hex.replace('#', '').toUpperCase();

/** Share of opaque pixels within STRICT of each reference colour: how visible it really is in the logo. */
function referenceShares(image, references) {
  const counts = new Map(references.map((hex) => [hex, 0]));
  const cache = new Map();
  let opaque = 0;
  for (let offset = 0; offset < image.rgba.length; offset += 4) {
    if (image.rgba[offset + 3] < 250) continue;
    opaque += 1;
    const hex = hexOf(image.rgba, offset);
    let hit = cache.get(hex);
    if (hit === undefined) {
      hit = references.find((ref) => deltaEOk(ref, hex) < STRICT) ?? null;
      cache.set(hex, hit);
    }
    if (hit !== null) counts.set(hit, counts.get(hit) + 1);
  }
  return new Map([...counts].map(([hex, n]) => [hex, opaque === 0 ? 0 : n / opaque]));
}

function extract(image) {
  const started = performance.now();
  // §2.4: the caller hands at most 512 px, reduced with nearest-neighbour (as the analysis job will).
  const input = downscaleNearest(
    { width: image.width, height: image.height, data: new Uint8ClampedArray(image.rgba) },
    WIDTH,
  );
  const result = extractPalette(input);
  const ms = performance.now() - started;
  if (!result.ok) return { error: result.error, ms };
  // Decision B: a vivid removed background leads the clusters handed to the roles.
  const { background } = result.value;
  const brand = brandClusters ? brandClusters(result.value) : result.value.clusters;
  const roles = assignRoles(brand);
  return {
    ms,
    clusters: result.value.clusters.map((c) => ({ hex: c.hex, share: round(c.share) })),
    brand: brand.map((c) => ({ hex: c.hex, share: round(c.share) })),
    background: background ? `${background.hex}:${(background.share * 100).toFixed(0)}` : null,
    primary: roles.primary
      ? `${roles.primary.hex}${roles.primary.source === 'derived' ? '*' : ''}`
      : null,
  };
}

/**
 * Compare an extraction with reference colours (and their visible shares). A reference colour equal to the
 * background the bench itself added (white, board grey) cannot be told from it: not counted as visible.
 */
function score(extraction, shares, added = null) {
  if (!extraction.clusters) return { failed: true };
  const all = [...shares.keys()];
  // Found among the brand clusters (decision B: a vivid removed background counts as found).
  const found = extraction.brand ?? extraction.clusters;
  const refs = all.filter((hex) => added === null || deltaEOk(hex, added) >= MATCH);
  const near = (hex) => Math.min(...found.map((c) => deltaEOk(hex, c.hex)), Infinity);
  const visible = refs.filter((hex) => shares.get(hex) >= VISIBLE);
  const missed = visible.filter((hex) => near(hex) >= MATCH);
  // An intruder matches no colour of the logo, the white of a logo included: a white cluster is a leaked
  // background only when the logo itself has no white.
  const spurious = extraction.clusters.filter(
    (c) => Math.min(...all.map((hex) => deltaEOk(hex, c.hex)), Infinity) >= MATCH,
  );
  return {
    visible: visible.length,
    found: visible.length - missed.length,
    foundStrict: visible.filter((hex) => near(hex) < STRICT).length,
    missed: missed.map((hex) => `${hex}:${(shares.get(hex) * 100).toFixed(1)}`),
    spurious: spurious.map((c) => `${c.hex}:${(c.share * 100).toFixed(1)}`),
    spuriousShare: round(spurious.reduce((sum, c) => sum + c.share, 0)),
  };
}

async function decode(bytes) {
  const started = performance.now();
  const result = await normalizeRaster(new Uint8Array(bytes));
  return result.ok
    ? { image: result.value, ms: performance.now() - started }
    : { error: result.error.code, ms: performance.now() - started };
}

const ADDED = { 'png-white': '#FFFFFF', 'jpeg-white': '#FFFFFF', 'jpeg-board': '#F2F2F2' };

/** The same logo as users really send it: flattened on white, as PNG and as JPEG. */
async function variants(png) {
  const white = sharp(png).flatten({ background: '#FFFFFF' });
  return {
    'png-white': await white.clone().png().toBuffer(),
    'jpeg-white': await white.clone().jpeg({ quality: 75, chromaSubsampling: '4:2:0' }).toBuffer(),
    // presentation board: logo small and centred on a light grey card, as on Pinterest / Behance
    'jpeg-board': await sharp(png)
      .resize(256)
      .extend({ top: 128, bottom: 128, left: 128, right: 128, background: '#F2F2F2' })
      .flatten({ background: '#F2F2F2' })
      .jpeg({ quality: 75 })
      .toBuffer(),
  };
}

const round = (value) => Math.round(value * 10000) / 10000;

async function benchSvg(name, source, references) {
  const row = { name, stages: {} };
  try {
    const started = performance.now();
    const sanitized = sanitizeSvg(new TextEncoder().encode(source));
    row.stages.sanitizeMs = performance.now() - started;
    if (!sanitized.ok) return { ...row, error: `sanitize:${sanitized.error.code}` };
    row.warnings = sanitized.value.warnings.map((w) => w.code);
    const svg = sanitized.value.svg;
    const image = render(svg, WIDTH);
    const shares = referenceShares(image, references);
    row.references = Object.fromEntries([...shares].map(([hex, s]) => [hex, round(s)]));
    const transparent = extract(image);
    row.transparent = { ...transparent, ...score(transparent, shares) };
    for (const [kind, bytes] of Object.entries(await variants(image.png))) {
      const decoded = await decode(bytes);
      const extraction = decoded.image ? extract(decoded.image) : { error: decoded.error };
      row[kind] = { ...extraction, ...score(extraction, shares, ADDED[kind]) };
    }
    const mono = monochromeSvg(svg, '#000000');
    if (!mono.ok) row.mono = { error: mono.error.code };
    else {
      const fidelity = await fidelityScore(svg, mono.value.svg, rasterizer);
      row.mono = {
        path: mono.value.path,
        warnings: mono.value.warnings,
        fidelity: fidelity.ok ? round(fidelity.value) : fidelity.error.code,
      };
    }
  } catch (error) {
    row.error = `exception:${error instanceof Error ? error.message : String(error)}`;
  }
  return row;
}

async function benchRaster(name, bytes, references, background = null) {
  const row = { name };
  try {
    const decoded = await decode(bytes);
    if (decoded.error) return { ...row, error: `decode:${decoded.error}` };
    const extraction = extract(decoded.image);
    row.extraction = extraction;
    if (references) {
      // The page around a logo cut from a charter is not part of the logo: not a colour to find.
      const shares = referenceShares(
        decoded.image,
        references.filter((hex) => background === null || deltaEOk(hex, background) >= MATCH),
      );
      row.references = Object.fromEntries([...shares].map(([hex, s]) => [hex, round(s)]));
      Object.assign(row.extraction, score(extraction, shares));
    }
  } catch (error) {
    row.error = `exception:${error instanceof Error ? error.message : String(error)}`;
  }
  return row;
}

// ---------------------------------------------------------------------------------------------- corpus
const results = {
  label,
  date: new Date().toISOString(),
  settings: { WIDTH, MATCH, STRICT, VISIBLE },
};

const kindOf = (entry) =>
  entry.gradients > 0 ? 'gradient' : entry.has_mask || entry.has_filter ? 'mask-filter' : 'flat';

/**
 * Deterministic stratified sample: same proportions of kind × mark type as the library, at least 2 per
 * stratum, evenly spaced in file order. The same N always gives the same logos, so runs compare.
 */
function sample(entries, size) {
  if (size >= entries.length) return entries;
  const strata = new Map();
  for (const entry of [...entries].sort((a, b) => a.file.localeCompare(b.file))) {
    const key = `${kindOf(entry)}/${entry.mark_type}`;
    strata.set(key, [...(strata.get(key) ?? []), entry]);
  }
  return [...strata.values()].flatMap((group) => {
    const take = Math.min(
      group.length,
      Math.max(2, Math.round((group.length / entries.length) * size)),
    );
    return Array.from(
      { length: take },
      (_, index) => group[Math.floor((index * group.length) / take)],
    );
  });
}

const catalog = sample(
  JSON.parse(readFileSync(join(corpus, 'library/catalog.json'), 'utf8')),
  sampleSize,
);
results.settings.sample = catalog.length;
results.library = [];
for (const entry of catalog) {
  const source = readFileSync(join(corpus, 'library/svg', entry.file), 'utf8');
  const row = await benchSvg(entry.file, source, entry.colors.map(norm));
  row.kind = kindOf(entry);
  row.markType = entry.mark_type;
  results.library.push(row);
  if (results.library.length % 40 === 0) console.log(`library ${results.library.length}`);
}

results.charters = [];
const chartersDir = join(corpus, 'charters');
for (const slug of readdirSync(chartersDir, { withFileTypes: true }).filter((d) =>
  d.isDirectory(),
)) {
  const truth = JSON.parse(readFileSync(join(chartersDir, slug.name, 'truth.json'), 'utf8'));
  for (const logo of truth.logos) {
    const references = logo.renderedPalette.map((c) => norm(c.hex));
    const row = await benchRaster(
      `${slug.name}/${logo.preview}`,
      readFileSync(join(chartersDir, slug.name, logo.preview)),
      references,
      logo.background ? norm(logo.background) : null,
    );
    row.background = logo.background ?? null;
    // brand intent: how far is each official logo colour from the nearest extracted cluster
    if (row.extraction?.clusters) {
      row.official = Object.fromEntries(
        truth.logoPalette.map((hex) => [
          norm(hex),
          round(Math.min(...row.extraction.clusters.map((c) => deltaEOk(norm(hex), c.hex)))),
        ]),
      );
    }
    results.charters.push(row);
  }
}

results.raw = [];
for (const lot of readdirSync(join(corpus, 'raw'))) {
  for (const file of readdirSync(join(corpus, 'raw', lot))) {
    results.raw.push(
      await benchRaster(`${lot}/${file}`, readFileSync(join(corpus, 'raw', lot, file))),
    );
  }
}

// ---------------------------------------------------------------------------------------------- summary
const pct = (part, whole) => (whole === 0 ? '—' : `${((part / whole) * 100).toFixed(1)} %`);
const quantile = (values, q) => {
  const sorted = values.filter((v) => typeof v === 'number').sort((a, b) => a - b);
  return sorted.length === 0
    ? NaN
    : sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
};
const lines = [
  `# Banc d'essai — ${label}`,
  '',
  `${results.date} · seuils ΔE_OK ${MATCH} (strict ${STRICT}), couleur visible ≥ ${VISIBLE * 100} %`,
  '',
];

const lib = results.library;
lines.push(`## Bibliothèque (${lib.length} SVG)`, '');
lines.push(
  `Erreurs : ${lib.filter((r) => r.error).length}` +
    (lib.some((r) => r.error)
      ? ` (${[...new Set(lib.filter((r) => r.error).map((r) => r.error.split(':').slice(0, 2).join(':')))].slice(0, 6).join(', ')})`
      : ''),
  '',
);
lines.push(
  '| entrée | kind | logos | couleurs visibles trouvées | strict | logos parfaits | logos avec intrus | part intrus moy. | groupes moy. |',
  '|---|---|---|---|---|---|---|---|---|',
);
// Gradients: a gradient is cut into slices whose centres only approach its stops; their "intruders" are
// mostly legitimate intermediate colours. Their rows are indicative.
for (const variant of ['transparent', 'png-white', 'jpeg-white', 'jpeg-board']) {
  for (const kind of ['flat', 'gradient', 'mask-filter']) {
    const rows = lib.filter(
      (r) =>
        r.kind === kind && r[variant] && !r[variant].failed && r[variant].visible !== undefined,
    );
    if (rows.length === 0) continue;
    const visible = rows.reduce((s, r) => s + r[variant].visible, 0);
    const found = rows.reduce((s, r) => s + r[variant].found, 0);
    const strict = rows.reduce((s, r) => s + r[variant].foundStrict, 0);
    const perfect = rows.filter(
      (r) => r[variant].found === r[variant].visible && r[variant].spurious.length === 0,
    ).length;
    const intruders = rows.filter((r) => r[variant].spurious.length > 0).length;
    const intruderShare = rows.reduce((s, r) => s + r[variant].spuriousShare, 0) / rows.length;
    const groups = rows.reduce((s, r) => s + (r[variant].clusters?.length ?? 0), 0) / rows.length;
    lines.push(
      `| ${variant} | ${kind} | ${rows.length} | ${pct(found, visible)} | ${pct(strict, visible)} | ${pct(perfect, rows.length)} | ${pct(intruders, rows.length)} | ${(intruderShare * 100).toFixed(1)} % | ${groups.toFixed(2)} |`,
    );
  }
}
const monoRows = lib.filter((r) => r.mono && !r.mono.error);
const fidelities = monoRows.map((r) => r.mono.fidelity).filter((v) => typeof v === 'number');
lines.push(
  '',
  `Monochrome : chemin structurel ${pct(monoRows.filter((r) => r.mono.path === 'structural').length, lib.length)}, ` +
    `fidélité médiane ${quantile(fidelities, 0.5).toFixed(3)}, p10 ${quantile(fidelities, 0.1).toFixed(3)}, ` +
    `< 0,95 : ${fidelities.filter((f) => f < 0.95).length} logos, < 0,80 : ${fidelities.filter((f) => f < 0.8).length}.`,
);
lines.push(
  `Temps d'extraction (transparent) : médiane ${quantile(
    lib.map((r) => r.transparent?.ms),
    0.5,
  ).toFixed(1)} ms, p95 ${quantile(
    lib.map((r) => r.transparent?.ms),
    0.95,
  ).toFixed(1)} ms, max ${quantile(
    lib.map((r) => r.transparent?.ms),
    1,
  ).toFixed(1)} ms.`,
);
const worst = (variant) =>
  lib
    .filter((r) => r[variant]?.spuriousShare > 0)
    .sort((a, b) => b[variant].spuriousShare - a[variant].spuriousShare)
    .slice(0, 8);
for (const variant of ['jpeg-white', 'jpeg-board']) {
  lines.push(
    '',
    `Pires intrus (${variant}) : ` +
      worst(variant)
        .map(
          (r) =>
            `${r.name} ${(r[variant].spuriousShare * 100).toFixed(0)} % [${r[variant].spurious.slice(0, 2).join(' ')}]`,
        )
        .join(' · '),
  );
}
const missedFlat = lib.filter((r) => r.kind === 'flat' && r.transparent?.missed?.length > 0);
lines.push(
  '',
  `Couleurs visibles manquées en transparent (plats) : ${missedFlat.length} logos — ` +
    missedFlat
      .slice(0, 10)
      .map((r) => `${r.name} [${r.transparent.missed.join(' ')}]`)
      .join(' · '),
);

lines.push(
  '',
  `## Logos des chartes (${results.charters.length})`,
  '',
  '| logo | fond (vérité) | fond retiré | primary | trouvées | intrus | ΔE aux couleurs officielles | groupes extraits |',
  '|---|---|---|---|---|---|---|---|',
);
for (const r of results.charters) {
  const e = r.extraction ?? {};
  const official = Object.entries(r.official ?? {})
    .map(([hex, d]) => `${hex} ${d.toFixed(2)}`)
    .join(' · ');
  lines.push(
    `| ${r.name} | ${r.background ?? '—'} | ${e.background ?? '—'} | ${e.primary ?? '—'} | ${e.found ?? '—'}/${e.visible ?? '—'} | ${(e.spurious ?? []).join(' ') || '—'} | ${official} | ${(e.clusters ?? []).map((c) => `${c.hex}:${(c.share * 100).toFixed(0)}`).join(' ')} |`,
  );
}

lines.push('', `## Images réelles (${results.raw.length}, sans vérité terrain)`, '');
const rawOk = results.raw.filter((r) => r.extraction?.clusters);
lines.push(
  `Décodées : ${rawOk.length}/${results.raw.length}. Groupes moyens ${(rawOk.reduce((s, r) => s + r.extraction.clusters.length, 0) / rawOk.length).toFixed(2)}. ` +
    `Groupe dominant ≥ 40 % (fond probablement gardé) : ${pct(rawOk.filter((r) => r.extraction.clusters[0].share >= 0.4).length, rawOk.length)}. ` +
    `Saturées à 8 groupes : ${rawOk.filter((r) => r.extraction.clusters.length >= 8).length}.`,
);
const pairs = rawOk.filter((r) => r.name.endsWith('-removebg-preview.png'));
const distance = (a, b) =>
  a.reduce((s, c) => s + c.share * Math.min(...b.map((d) => deltaEOk(c.hex, d.hex))), 0);
lines.push(
  '',
  "Paires JPEG d'origine / PNG détouré : écart pondéré de la palette de l'original à celle du détouré (0 = rien en trop ; un fond gardé pèse sa part × son ΔE) :",
  '',
);
for (const cut of pairs) {
  const base = cut.name.replace('-removebg-preview.png', '');
  const key = (name) =>
    name
      .split('/')[1]
      .replace(/\.(jpe?g|png)$/i, '')
      .replace(/[^a-z0-9]/gi, '_');
  const original = rawOk.find(
    (r) =>
      r !== cut && !r.name.includes('removebg') && key(r.name).startsWith(key(base).slice(0, 18)),
  );
  if (!original) continue;
  lines.push(
    `- ${cut.name.split('/')[1]} : ${distance(original.extraction.clusters, cut.extraction.clusters).toFixed(3)} · original dominant ${original.extraction.clusters[0].hex} ${(original.extraction.clusters[0].share * 100).toFixed(0)} %`,
  );
}

const out = join(corpus, 'reports', `${results.date.slice(0, 10)}-${label}`);
mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'results.json'), JSON.stringify(results, null, 1) + '\n');
writeFileSync(join(out, 'summary.md'), lines.join('\n') + '\n');
console.log(lines.join('\n'));
console.log(`\n→ ${out}`);
