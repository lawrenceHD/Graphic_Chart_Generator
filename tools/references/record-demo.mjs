// Regenerates the demo research recordings (one JSON per example logo) with ONE live Gemini research each.
// The recording is keyed by the fingerprint of the PNG that the worker renders for the logo (1024 px wide for an
// SVG, normalised for a raster), so it must be regenerated whenever an example logo changes.
//
// Usage (repository root, after `pnpm -r --filter "./packages/*" build`):
//   AI_API_KEY=... node tools/references/record-demo.mjs [--only id1,id2] [--out apps/worker/recordings]
//
// Environment:
//   AI_API_KEY            Gemini key (required, never printed, never read from a file by this script).
//   AI_MODEL              vision model (default gemini-3.5-flash-lite).
//   RESEARCH_CORPUS_DIR   private corpus holding index.jsonl files (default corpus-reel). Without a library no
//                         recording is produced (the research degrades): the script says so and writes nothing.
//
// Free-tier discipline: no transport retry, examples handled one after the other, and the run stops at the
// first quota error (429 / AI_QUOTA). Nothing is invented: an example without a valid recording writes no file.
//
// Replay in the worker: RESEARCH_RECORD_DIR=apps/worker/recordings (see apps/worker/recordings/README.md).

import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '../..');
const require = createRequire(import.meta.url);
const ts = require('typescript');
const {
  createGeminiTransport,
  loadFontCatalogue,
  parseRecording,
  runResearch,
  serializeRecording,
} = await import(pathToFileURL(join(root, 'packages/ai/dist/index.js')).href);
const { ensureViewBox, sanitizeSvg } = await import(
  pathToFileURL(join(root, 'packages/svg-engine/dist/index.js')).href
);
const { createNodeRasterizer, normalizeRaster } = await import(
  pathToFileURL(join(root, 'packages/svg-engine/dist/raster/index.js')).href
);

const args = process.argv.slice(2);
const option = (name) => {
  const at = args.indexOf(name);
  return at === -1 ? undefined : args[at + 1];
};
const only = option('--only')?.split(',').filter(Boolean);
const outDir = resolve(root, option('--out') ?? 'apps/worker/recordings');
const examplesDir = join(root, 'apps/web/src/landing/examples/data');
const publicDir = join(root, 'apps/web/public');
// Same width as LOGO_FOR_AI of apps/worker/src/research-step.ts.
const LOGO_FOR_AI = 1024;

const apiKey = process.env.AI_API_KEY?.trim();
if (!apiKey || /^(replace-me|development)/u.test(apiKey)) {
  console.error('AI_API_KEY is not set: no recording can be made (nothing was written).');
  process.exit(2);
}
const model = process.env.AI_MODEL?.trim() || 'gemini-3.5-flash-lite';

// The example data files only import types: transpiling them is enough to read them.
async function loadExamples() {
  const files = (await readdir(examplesDir))
    .filter((name) => name.endsWith('.ts') && name !== 'index.ts')
    .sort();
  const examples = [];
  for (const name of files) {
    const source = await readFile(join(examplesDir, name), 'utf8');
    const { outputText } = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    });
    const module = await import(
      `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`
    );
    for (const value of Object.values(module)) {
      if (value && typeof value === 'object' && typeof value.id === 'string') examples.push(value);
    }
  }
  return examples;
}

// The PNG the worker would hand to the research for this logo: the upload scan (apps/worker/src/scan.ts) first,
// then the render of research-step.ts. An SVG is sanitised and given a viewBox; a raster is normalised twice
// (at the scan, then again by the research step).
async function renderLogo(logo) {
  const rasterizer = createNodeRasterizer();
  const fromSvg = async (svgBytes) => {
    const sanitized = sanitizeSvg(svgBytes);
    if (!sanitized.ok) throw new Error(`logo refused by the sanitizer (${sanitized.error.code})`);
    const svg = await ensureViewBox(sanitized.value, rasterizer);
    if (!svg.ok) throw new Error(`viewBox not resolved (${svg.error.code})`);
    const stored = new TextEncoder().encode(svg.value);
    const image = await rasterizer.rasterize(new TextDecoder().decode(stored), LOGO_FOR_AI);
    if (!image.ok) throw new Error(`logo not renderable (${image.error.code})`);
    return image.value.png;
  };
  const data = /^data:image\/svg\+xml,(.*)$/su.exec(logo);
  if (data) return fromSvg(new TextEncoder().encode(decodeURIComponent(data[1])));
  const bytes = new Uint8Array(await readFile(join(publicDir, logo)));
  if (logo.endsWith('.svg')) return fromSvg(bytes);
  const scanned = await normalizeRaster(bytes);
  if (!scanned.ok) throw new Error(`logo not renderable (${scanned.error.code})`);
  const image = await normalizeRaster(scanned.value.png);
  if (!image.ok) throw new Error(`logo not renderable (${image.error.code})`);
  return image.value.png;
}

async function readCorpusIndex(dir) {
  let entries;
  try {
    entries = await readdir(dir, { recursive: true });
  } catch (cause) {
    if (cause?.code === 'ENOENT') return undefined;
    throw cause;
  }
  const files = entries.filter((entry) => /(^|[\\/])index\.jsonl$/u.test(entry)).sort();
  if (files.length === 0) return undefined;
  const texts = await Promise.all(files.map((file) => readFile(join(dir, file), 'utf8')));
  return texts.map((text) => text.trimEnd()).join('\n');
}

const corpusDir = resolve(root, process.env.RESEARCH_CORPUS_DIR ?? 'corpus-reel');
const transport = createGeminiTransport({
  apiKey,
  retries: 0,
  fetch: (url, init) => fetch(url, init),
  sleep: (ms) => new Promise((done) => setTimeout(done, ms)),
});
const catalogue = loadFontCatalogue();

const examples = (await loadExamples()).filter((example) => !only || only.includes(example.id));
if (examples.length === 0) {
  console.error('no example selected');
  process.exit(2);
}
await mkdir(outDir, { recursive: true });

let written = 0;
let stopped = false;
for (const example of examples) {
  const palette = [example.colors.primary.hex, example.colors.accent.hex];
  const png = Buffer.from(await renderLogo(example.logo));
  const result = await runResearch(
    {
      transport,
      visionModel: model,
      catalogue,
      readIndex: () => readCorpusIndex(corpusDir),
      now: () => new Date().toISOString(),
    },
    { logo: { data: new Uint8Array(png), mimeType: 'image/png' }, palette, purpose: 'charter' },
  );
  if (!result.ok) {
    console.error(`${example.id}: research refused (${result.error.code})`);
    continue;
  }
  const { source, recording, issues } = result.value;
  const codes = issues.map((issue) => issue.code);
  const quota =
    codes.includes('research-failed') &&
    issues.some((issue) => issue.code === 'research-failed' && issue.detail === 'AI_QUOTA');
  if (source !== 'live' || !recording) {
    console.error(`${example.id}: no recording (source ${source}; issues ${codes.join(', ')})`);
    if (quota) {
      console.error('Gemini quota reached (429): stopping, nothing more is requested.');
      stopped = true;
      break;
    }
    continue;
  }
  if (result.value.research?.embeddingError) {
    const reason = result.value.research.embeddingError;
    console.error(`${example.id}: visual similarity failed (${reason}), recording not kept`);
    if (reason === 'AI_QUOTA') {
      console.error('Gemini quota reached (429): stopping.');
      stopped = true;
      break;
    }
    continue;
  }
  // The file is validated by the same parser the worker uses before it is kept.
  const text = serializeRecording(recording);
  const checked = parseRecording(text);
  if (!checked.ok) {
    console.error(`${example.id}: recording rejected by parseRecording (${checked.error})`);
    continue;
  }
  await writeFile(join(outDir, `${checked.value.key}.json`), `${text}\n`, 'utf8');
  written += 1;
  const degraded = codes.filter((code) => code !== 'replayed');
  console.log(
    `${example.id}: ${checked.value.key}.json (issues: ${degraded.join(', ') || 'none'})`,
  );
}
console.log(
  `${String(written)} recording(s) written to ${outDir}${stopped ? ' (stopped on quota)' : ''}`,
);
process.exit(written > 0 || stopped ? 0 : 1);
