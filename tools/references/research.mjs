// Run the full reference research on one logo, against the private library (corpus-reel/pinterest/index.jsonl).
// Prints the art direction with its evidence: the same call the studio makes after the logo upload.
//
// Usage (from the repository root, after `pnpm --filter @app/ai build`):
//   node tools/references/research.mjs <logo.png|jpg|webp> [#RRGGBB ...]

import { readFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import {
  createGeminiTransport,
  loadFontCatalogue,
  parseReferenceIndex,
  researchBrand,
} from '../../packages/ai/dist/index.js';

const MIME = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};
const [logoPath, ...palette] = process.argv.slice(2);
const mimeType = logoPath ? MIME[extname(logoPath).toLowerCase()] : undefined;
if (!logoPath || !mimeType) {
  console.error('usage: node tools/references/research.mjs <logo.png|jpg|webp> [#RRGGBB ...]');
  process.exit(2);
}

const root = resolve(import.meta.dirname, '../..');
const env = readFileSync(resolve(root, '.env.local'), 'utf8');
const apiKey = /^AI_API_KEY=(.*)$/m.exec(env)?.[1]?.trim().replace(/^"|"$/g, '');
if (!apiKey) {
  console.error('AI_API_KEY missing from .env.local');
  process.exit(2);
}

const index = parseReferenceIndex(
  readFileSync(resolve(root, 'corpus-reel/pinterest/index.jsonl'), 'utf8'),
);
console.log(
  `library: ${index.references.length} references, ${index.rejected.length} rejected lines`,
);

const started = Date.now();
const result = await researchBrand(
  {
    transport: createGeminiTransport({
      apiKey,
      fetch: (url, init) => fetch(url, init),
      sleep: (ms) => new Promise((done) => setTimeout(done, ms)),
    }),
    visionModel: 'gemini-3.5-flash-lite',
    library: index.references,
    catalogue: loadFontCatalogue(),
  },
  { logo: { data: new Uint8Array(readFileSync(logoPath)), mimeType }, palette },
);
if (!result.ok) {
  console.error(`research failed: ${result.error.code} ${result.error.message}`);
  process.exit(1);
}
const { reading, direction, pairings, deepQueries, warnings } = result.value;
const out = {
  seconds: (Date.now() - started) / 1000,
  warnings,
  reading,
  plan: direction.sections.map(
    (s) =>
      `${s.section}${s.core ? '' : ` (${Math.round(s.support * 100)} %, ${s.evidence.length} refs)`}`,
  ),
  mockups: direction.mockups.map((m) => `${m.subject} ${Math.round(m.support * 100)} %`),
  styles: direction.styles.slice(0, 4),
  typography: direction.typography,
  layout: direction.layout,
  pairings: pairings.map(
    (p) => `${p.heading.family} / ${p.body.family}  [${p.heading.reasons.slice(0, 2).join(', ')}]`,
  ),
  insights: direction.insights,
  topReferences: direction.references.slice(0, 6),
  deepQueries,
};
console.log(JSON.stringify(out, null, 1));
