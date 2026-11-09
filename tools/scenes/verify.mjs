// Renders scenes with the real mockup-engine compositor and real logos, in headless Chrome, onto one PNG sheet:
// the visual check of 06_MOCKUP_ENGINE.md §7 for scenes and logos together.
//
//   node tools/scenes/verify.mjs <out.png> [--cols 2] [--width 900] [--logo 0] [scene id ...]
//
// Needs the repository's node_modules (esbuild, zod) and Chrome (CHROME_PATH, default Windows install path).
import { spawn } from 'node:child_process';
import {
  createReadStream,
  existsSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const out = args.shift();
if (out === undefined) {
  console.error('usage: verify.mjs <out.png> [--cols n] [--width px] [--logo n] [scene id ...]');
  process.exit(2);
}
const options = { cols: '2', width: '900', logo: '0' };
const ids = [];
for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg.startsWith('--')) options[arg.slice(2)] = args[++i];
  else ids.push(arg);
}
const scenes = join(root, 'apps/web/public/scenes');
const chosen =
  ids.length > 0
    ? ids
    : readdirSync(scenes).filter((n) => existsSync(join(scenes, n, 'scene.json')));

// esbuild is a transitive dependency (vite): find it in the pnpm store when it is not hoisted.
const store = join(root, 'node_modules/.pnpm');
const found = readdirSync(store)
  .filter((name) => /^esbuild@0\.2\d/u.test(name))
  .sort()
  .pop();
if (found === undefined) throw new Error('esbuild not found in node_modules/.pnpm');
const require = createRequire(join(store, found, 'node_modules/esbuild/package.json'));
const { build } = require('esbuild');
const work = mkdtempSync(join(tmpdir(), 'scene-verify-'));
await build({
  entryPoints: [join(root, 'tools/scenes/verify/harness.mjs')],
  bundle: true,
  format: 'esm',
  outfile: join(work, 'harness.js'),
  alias: {
    '@app/mockup-engine': join(root, 'packages/mockup-engine/src/index.ts'),
    '@app/contracts': join(root, 'packages/contracts/src/index.ts'),
    '@app/kernel': join(root, 'packages/kernel/src/index.ts'),
  },
  nodePaths: [join(root, 'apps/web/node_modules')],
  logLevel: 'error',
});

const TYPES = {
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.html': 'text/html',
};
let child = null;
let exitCode = 1;
const finish = () => {
  child?.kill();
  server.close();
  // Chrome may still hold its profile for a moment: a leftover temp folder is not an error.
  try {
    rmSync(work, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
  } catch {
    console.error(`could not remove ${work}: delete it by hand`);
  }
  process.exit(exitCode);
};
const server = createServer((request, response) => {
  const path = decodeURIComponent((request.url ?? '/').split('?')[0]);
  if (request.method === 'POST' && path === '/result') {
    const chunks = [];
    request.on('data', (chunk) => chunks.push(chunk));
    request.on('end', () => {
      response.writeHead(200).end();
      const result = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (typeof result.png === 'string') {
        writeFileSync(resolve(out), Buffer.from(result.png.split(',')[1], 'base64'));
        console.log(result.report.join('\n'));
        exitCode = 0;
      } else console.error(`harness failed: ${String(result.error)}`);
      finish();
    });
    return;
  }
  const file =
    path === '/'
      ? null
      : path === '/harness.js'
        ? join(work, 'harness.js')
        : path.startsWith('/scenes/') || path.startsWith('/demo/')
          ? join(root, 'apps/web/public', path)
          : null;
  if (path === '/') {
    response.writeHead(200, { 'content-type': 'text/html' });
    response.end(
      '<!doctype html><meta charset="utf-8"><script type="module" src="/harness.js"></script>',
    );
    return;
  }
  if (
    file === null ||
    (!file.startsWith(join(root, 'apps/web/public')) && !file.startsWith(work)) ||
    !existsSync(file) ||
    !statSync(file).isFile()
  ) {
    response.writeHead(404).end();
    return;
  }
  response.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(response);
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const { port } = server.address();
const chrome = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const url = `http://127.0.0.1:${String(port)}/?ids=${chosen.join(',')}&cols=${options.cols}&w=${options.width}&logo=${options.logo}`;
// The page posts its sheet back to /result; Chrome is then closed. A timeout ends a page that never answers.
child = spawn(
  chrome,
  [
    '--headless=new',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
    `--user-data-dir=${join(work, 'profile')}`,
    url,
  ],
  { stdio: 'ignore' },
);
setTimeout(() => {
  console.error('timeout: the page did not answer');
  finish();
}, 240000);
