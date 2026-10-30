// Generates scene photographs for the mockup catalogue with Cloudflare Workers AI (FLUX.2 klein, Apache-2.0,
// free daily allowance). Every printable surface is asked blank, matte and white: the engine recolours it
// to the brand palette and projects the logo by computation (06_MOCKUP_ENGINE.md), the model never sees it.
//
//   node --env-file=<path to .env with CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN> tools/scenes/generate.mjs \
//        <pack.json> <out dir> [scene id ...]
//
// The pack lists { id, prompt, width?, height?, model? }. Output: <out>/<id>/raw.png and prompt.txt
// (the provenance written into LICENSE.md when the scene enters the catalogue).
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const [packPath, outDir, ...only] = process.argv.slice(2);
if (packPath === undefined || outDir === undefined) {
  console.error('usage: generate.mjs <pack.json> <out dir> [scene id ...]');
  process.exit(2);
}
const account = process.env.CLOUDFLARE_ACCOUNT_ID;
const token = process.env.CLOUDFLARE_API_TOKEN;
if (!account || !token) {
  console.error('CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN are required');
  process.exit(2);
}

const pack = JSON.parse(readFileSync(packPath, 'utf8'));
const COMMON = pack.common ?? '';
const MODELS = {
  standard: '@cf/black-forest-labs/flux-2-klein-4b',
  high: '@cf/black-forest-labs/flux-2-klein-9b',
};

for (const scene of pack.scenes) {
  if (only.length > 0 && !only.includes(scene.id)) continue;
  const dir = join(outDir, scene.id);
  const variants = scene.variants ?? 1;
  mkdirSync(dir, { recursive: true });
  for (let v = 0; v < variants; v += 1) {
    const file = join(dir, variants === 1 ? 'raw.png' : `raw-${String(v)}.png`);
    if (existsSync(file)) {
      console.log(`${scene.id}: ${file} exists, skipped`);
      continue;
    }
    const prompt = `${scene.prompt} ${COMMON}`.trim().slice(0, 2048);
    const form = new FormData();
    form.append('prompt', prompt);
    form.append('width', String(scene.width ?? 1920));
    form.append('height', String(scene.height ?? 1088));
    if (variants > 1) form.append('seed', String(1000 + v * 7919));
    const model = MODELS[scene.model ?? 'standard'];
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${model}`,
      { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form },
    );
    const text = await response.text();
    if (!response.ok) {
      console.error(`${scene.id}: HTTP ${String(response.status)} ${text.slice(0, 300)}`);
      if (response.status === 429) process.exit(1);
      continue;
    }
    const image = JSON.parse(text)?.result?.image;
    if (typeof image !== 'string') {
      console.error(`${scene.id}: no image in the response`);
      continue;
    }
    writeFileSync(file, Buffer.from(image, 'base64'));
    writeFileSync(join(dir, 'prompt.txt'), `${model}\n${new Date().toISOString()}\n${prompt}\n`);
    console.log(`${scene.id}: ${file}`);
  }
}
