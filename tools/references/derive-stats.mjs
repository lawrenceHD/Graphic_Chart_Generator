// Derives the small, committable statistics of the private reference library (no image, id, file name or embedding):
// per sector, what real professional identities show (sections, mockups, styles, typography, palette hues).
//
// Usage (from the repository root, after `pnpm --filter @app/ai build`):
//   node tools/references/derive-stats.mjs [corpus-dir]      (default corpus-reel)
// Writes tools/references/derived/library-stats.json. Regenerate it after every analyze.py or on-demand run.

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { deriveLibraryStats, parseReferenceIndex } from '../../packages/ai/dist/index.js';

const root = resolve(import.meta.dirname, '../..');
const corpus = resolve(root, process.argv[2] ?? 'corpus-reel');

const indexFiles = readdirSync(corpus, { recursive: true, encoding: 'utf8' })
  .filter((entry) => /(^|[\\/])index\.jsonl$/u.test(entry))
  .sort();
if (indexFiles.length === 0) {
  console.error(`no index.jsonl under ${corpus}: run tools/references/analyze.py first`);
  process.exit(2);
}
const text = indexFiles
  .map((file) => readFileSync(join(corpus, file), 'utf8').trimEnd())
  .join('\n');
const index = parseReferenceIndex(text);
if (index.rejected.length > 0) {
  console.warn(
    `${index.rejected.length} index lines rejected (lines ${index.rejected.slice(0, 10)})`,
  );
}

// Images collected per sector, indexed or not: the manifest of the library, when it is there.
const collected = {};
try {
  const manifest = JSON.parse(readFileSync(join(corpus, 'pinterest', 'manifest.json'), 'utf8'));
  for (const entry of manifest) collected[entry.sector] = (collected[entry.sector] ?? 0) + 1;
} catch {
  console.warn('no pinterest/manifest.json: "collected" counts are 0');
}

const stats = deriveLibraryStats(index.references, collected);
const out = join(import.meta.dirname, 'derived', 'library-stats.json');
mkdirSync(join(import.meta.dirname, 'derived'), { recursive: true });
// One line per { name, share } pair: the file stays small and its diffs readable.
const json = JSON.stringify(stats, null, 1).replace(
  /\{\s+"name": ("[^"]+"),\s+"share": ([\d.]+)\s+\}/gu,
  '{"name":$1,"share":$2}',
);
writeFileSync(out, `${json}\n`, 'utf8');
console.log(
  `${index.references.length} references, ${Object.keys(stats.sectors).length} sectors, ` +
    `${stats.unindexedSectors.length} sectors without any indexed reference -> ${out}`,
);
