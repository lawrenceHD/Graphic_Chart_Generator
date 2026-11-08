// Fetches only the references ONE task needs (a charter or a mockup scene), analyses them, then DELETES the raw
// images and keeps the derivatives: reference cards (palette, sections, mockups, styles), embeddings and source notes.
//
// Usage (from the repository root, after `pnpm --filter @app/ai build`):
//   node tools/references/fetch-on-demand.mjs --task mockups|charter --sector cafe-bakery \
//        [--style minimal --style warm] [--subject "paper bag"] \
//        [--url https://www.pinterest.com/pin/123/ ...] [--urls-file links.txt] [--dir ./my-drops] \
//        [--search] [--max 8] [--dry-run]
//
// Inputs, by order of preference:
//   --url / --urls-file   public Pinterest pin pages (https://<x>.pinterest.com/pin/<id>/) or image links of
//                         i.pinimg.com and Behance's image host. The page is read like a link preview: only its
//                         og:image is used. Nothing else is followed.
//   --dir                 images you saved by hand (never deleted by this tool: only the temporary copies are).
//   --search              OPT-IN. Pinterest has no anonymous search API: this runs the same third-party scraper as
//                         collect.py (pinterest-dl). That is a grey area of Pinterest's terms, hence off by default.
//
// Manners: one request every 2 seconds, a 2 MB page / 8 MB image cap, https only, allowed hosts only, no cookie, no
// login, no captcha handling. A 401, 403 or 429 stops the run: it is never retried.
//
// Output: corpus-reel/on-demand/index.jsonl (read by the worker with the rest of the corpus) and sources.json.
// Raw images live in .cache/refs-on-demand/<run>/ (ignored by Git) and are removed in every case, even on failure.

import { createHash } from 'node:crypto';
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import { basename, extname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import {
  createPacer,
  extractPreviewImage,
  MAX_ON_DEMAND_REFERENCES,
  onDemandQueries,
  parseReferenceIndex,
  parseSourceLink,
  referenceFileName,
} from '../../packages/ai/dist/index.js';

const root = resolve(import.meta.dirname, '../..');
const { values } = parseArgs({
  options: {
    task: { type: 'string' },
    sector: { type: 'string' },
    style: { type: 'string', multiple: true, default: [] },
    subject: { type: 'string', multiple: true, default: [] },
    url: { type: 'string', multiple: true, default: [] },
    'urls-file': { type: 'string' },
    dir: { type: 'string' },
    search: { type: 'boolean', default: false },
    max: { type: 'string', default: '8' },
    out: { type: 'string', default: join(root, 'corpus-reel', 'on-demand') },
    'dry-run': { type: 'boolean', default: false },
  },
});

const fail = (message, code = 2) => {
  console.error(message);
  process.exit(code);
};
if (values.task !== 'mockups' && values.task !== 'charter')
  fail('--task mockups|charter is required');
if (!/^[a-z0-9-]{2,40}$/u.test(values.sector ?? '')) fail('--sector is required, e.g. cafe-bakery');
const sector = values.sector;
const max = Math.min(Math.max(1, Number.parseInt(values.max, 10) || 8), MAX_ON_DEMAND_REFERENCES);

const MIME_EXTENSION = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MAX_PAGE_BYTES = 2 * 1024 * 1024;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const USER_AGENT = 'GraphicChartOnDemand/1.0 (private design research, a few requests per task)';

// 1. Preflight, before any download: the analysis needs the key.
function apiKeyPresent() {
  if (process.env.AI_API_KEY?.trim()) return true;
  try {
    return /^AI_API_KEY=\S+/mu.test(readFileSync(join(root, '.env.local'), 'utf8'));
  } catch {
    return false;
  }
}
if (!values['dry-run'] && !apiKeyPresent()) {
  fail(
    'AI_API_KEY missing (environment or .env.local): nothing was downloaded. Use --dry-run to test the fetch.',
  );
}

// 2. Sources.
const links = [];
const rejected = [];
const rawLinks = [...values.url];
if (values['urls-file']) {
  rawLinks.push(
    ...readFileSync(values['urls-file'], 'utf8')
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => line !== '' && !line.startsWith('#')),
  );
}
for (const raw of rawLinks) {
  const parsed = parseSourceLink(raw);
  if (parsed.ok) links.push(parsed.value);
  else rejected.push({ link: raw.slice(0, 120), reason: parsed.error });
}
const dropped = values.dir
  ? readdirSync(values.dir)
      .filter((name) => /\.(jpe?g|png|webp)$/iu.test(name))
      .sort()
  : [];
if (links.length + dropped.length === 0 && !values.search) {
  fail(
    'no source: give --url (Pinterest pin pages or image links), --urls-file, --dir (images saved by hand) or --search.\n' +
      'Pinterest offers no anonymous search or download API: without an account, links and manual drops are the clean way.',
  );
}

// 3. Temporary workspace, always removed.
const runId = new Date()
  .toISOString()
  .replaceAll(/[-:.TZ]/gu, '')
  .slice(0, 14);
const work = join(root, '.cache', 'refs-on-demand', runId);
const manifest = [];
const notes = [];
let cleaned = false;
function cleanup() {
  if (cleaned) return;
  cleaned = true;
  let files = 0;
  let bytes = 0;
  if (existsSync(work)) {
    for (const entry of readdirSync(work, { recursive: true, withFileTypes: true })) {
      if (!entry.isFile()) continue;
      files += 1;
      bytes += statSync(join(entry.parentPath, entry.name)).size;
    }
    rmSync(work, { recursive: true, force: true });
  }
  if (existsSync(work)) fail(`could not delete ${work}: remove it by hand`, 3);
  console.log(`raw images deleted: ${files} files, ${(bytes / 1048576).toFixed(1)} MB (${work})`);
}
process.on('exit', cleanup);
process.on('SIGINT', () => process.exit(130));
mkdirSync(join(work, sector), { recursive: true });

const pacer = createPacer({
  minIntervalMs: 2000,
  now: () => Date.now(),
  sleep: (ms) => new Promise((done) => setTimeout(done, ms)),
});

class Stop extends Error {}

async function fetchLimited(url, limit, accept) {
  await pacer.wait();
  let current = url;
  for (let hop = 0; hop < 3; hop += 1) {
    const response = await fetch(current, {
      redirect: 'manual',
      headers: { 'user-agent': USER_AGENT, accept },
      signal: AbortSignal.timeout(20_000),
    });
    if ([401, 403, 429].includes(response.status)) {
      throw new Stop(
        `HTTP ${response.status} from ${new URL(current).hostname}: stopping, not retrying`,
      );
    }
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      const next = location ? parseSourceLink(new URL(location, current).href) : undefined;
      if (!next?.ok) throw new Error('redirect to a host that is not allowed');
      current = next.value.url;
      continue;
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const declared = Number(response.headers.get('content-length') ?? 0);
    if (declared > limit) throw new Error('response over the size cap');
    const body = new Uint8Array(await response.arrayBuffer());
    if (body.byteLength > limit) throw new Error('response over the size cap');
    return {
      body,
      type: (response.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase(),
    };
  }
  throw new Error('too many redirects');
}

async function download(link) {
  let imageUrl = link.url;
  if (link.kind === 'pin') {
    const page = await fetchLimited(link.url, MAX_PAGE_BYTES, 'text/html');
    imageUrl = extractPreviewImage(new TextDecoder().decode(page.body));
    if (imageUrl === undefined)
      throw new Error('no public preview image on this pin (login wall?)');
  }
  const image = await fetchLimited(imageUrl, MAX_IMAGE_BYTES, 'image/*');
  const extension = MIME_EXTENSION[image.type];
  if (extension === undefined) throw new Error(`unsupported content type ${image.type}`);
  return { bytes: image.body, extension, imageUrl };
}

function register(file, bytes, source, origin) {
  const target = join(work, file);
  mkdirSync(join(work, sector), { recursive: true });
  writeFileSync(target, bytes);
  manifest.push({ sector, file, alt: null, origin, source });
  notes.push({
    file,
    source,
    origin,
    bytes: bytes.byteLength,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    fetchedAt: new Date().toISOString(),
    task: values.task,
  });
}

let stopped;
try {
  for (const link of links) {
    if (manifest.length >= max) break;
    try {
      const { bytes, extension, imageUrl } = await download(link);
      register(referenceFileName(sector, link, extension), bytes, link.url, imageUrl);
      console.log(`fetched ${link.url}`);
    } catch (error) {
      if (error instanceof Stop) {
        stopped = error.message;
        break;
      }
      rejected.push({ link: link.url, reason: error instanceof Error ? error.message : 'failed' });
    }
  }
  for (const name of dropped) {
    if (manifest.length >= max) break;
    const bytes = new Uint8Array(readFileSync(join(values.dir, name)));
    if (bytes.byteLength > MAX_IMAGE_BYTES) {
      rejected.push({ link: 'dropped file', reason: 'over the size cap' });
      continue;
    }
    const digest = createHash('sha256').update(bytes).digest('hex').slice(0, 16);
    const link = { kind: 'image', url: `https://dropped.invalid/${digest}.jpg` };
    const file = referenceFileName(sector, link, extname(name).slice(1) || 'jpg');
    register(file, bytes, 'manual drop', 'manual drop');
  }
  if (values.search && manifest.length < max && !stopped) {
    const cli = join(root, 'tools', 'references', '.venv', 'Scripts', 'pinterest-dl');
    const queries = onDemandQueries({
      task: values.task,
      sector,
      styles: values.style,
      subjects: values.subject,
    });
    if (!existsSync(cli) && !existsSync(`${cli}.exe`)) {
      rejected.push({
        link: '--search',
        reason: 'pinterest-dl is not installed (tools/references/.venv)',
      });
    } else {
      const perQuery = Math.max(
        1,
        Math.ceil((max - manifest.length) / Math.max(1, queries.length)),
      );
      for (const query of queries) {
        const target = join(work, '_search');
        const run = spawnSync(
          cli,
          [
            'search',
            '-o',
            target,
            '-n',
            String(perQuery),
            '-r',
            '700x700',
            '--caption',
            'json',
            '--delay',
            '2.0',
            '--',
            query,
          ],
          { encoding: 'utf8', timeout: 300_000 },
        );
        if (run.status !== 0) rejected.push({ link: query, reason: 'pinterest-dl failed' });
      }
      const found = existsSync(join(work, '_search'))
        ? readdirSync(join(work, '_search'))
            .filter((name) => /\.(jpe?g|png|webp)$/iu.test(name))
            .sort()
        : [];
      for (const name of found.slice(0, max - manifest.length)) {
        const bytes = new Uint8Array(readFileSync(join(work, '_search', name)));
        const digest = createHash('sha256').update(bytes).digest('hex').slice(0, 16);
        const link = { kind: 'image', url: `https://search.invalid/${digest}.jpg` };
        register(
          referenceFileName(sector, link, extname(name).slice(1) || 'jpg'),
          bytes,
          'pinterest search',
          'pinterest-dl',
        );
      }
    }
  }

  console.log(`${manifest.length} reference(s) downloaded, ${rejected.length} refused or failed`);
  for (const item of rejected) console.log(`  refused ${item.link}: ${item.reason}`);
  if (stopped) console.log(`stopped: ${stopped}`);

  if (manifest.length > 0 && !values['dry-run']) {
    writeFileSync(join(work, 'manifest.json'), JSON.stringify(manifest, null, 1), 'utf8');
    const python = existsSync(join(root, 'tools', 'references', '.venv', 'Scripts', 'python.exe'))
      ? join(root, 'tools', 'references', '.venv', 'Scripts', 'python.exe')
      : 'python';
    const analysis = spawnSync(
      python,
      ['-I', join(root, 'tools', 'references', 'analyze.py'), '--root', work, '--pace', '4.5'],
      { cwd: root, encoding: 'utf8', stdio: ['ignore', 'inherit', 'inherit'] },
    );
    if (analysis.status !== 0)
      console.error(`analysis ended with status ${String(analysis.status)}`);
    const produced = existsSync(join(work, 'index.jsonl'))
      ? readFileSync(join(work, 'index.jsonl'), 'utf8')
      : '';
    const index = parseReferenceIndex(produced);
    mkdirSync(values.out, { recursive: true });
    const indexPath = join(values.out, 'index.jsonl');
    const known = parseReferenceIndex(existsSync(indexPath) ? readFileSync(indexPath, 'utf8') : '');
    const knownFiles = new Set(known.references.map((entry) => entry.file));
    const fresh = index.references.filter((entry) => !knownFiles.has(entry.file));
    const prefix =
      existsSync(indexPath) && !readFileSync(indexPath, 'utf8').endsWith('\n') ? '\n' : '';
    if (fresh.length > 0) {
      appendFileSync(
        indexPath,
        prefix + fresh.map((entry) => JSON.stringify(entry)).join('\n') + '\n',
        'utf8',
      );
    }
    const sourcesPath = join(values.out, 'sources.json');
    const previous = existsSync(sourcesPath) ? JSON.parse(readFileSync(sourcesPath, 'utf8')) : [];
    const keep = new Set(index.references.map((entry) => entry.file));
    const merged = [
      ...previous.filter((n) => !notes.some((m) => m.file === n.file)),
      ...notes.filter((n) => keep.has(n.file)),
    ];
    writeFileSync(sourcesPath, `${JSON.stringify(merged, null, 1)}\n`, 'utf8');
    console.log(
      `${fresh.length} new derived reference(s) -> ${indexPath} (${basename(sourcesPath)} holds the sources)`,
    );
  }
} finally {
  cleanup();
}
