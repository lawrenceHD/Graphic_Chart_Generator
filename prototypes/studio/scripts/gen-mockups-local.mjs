// Photorealistic mockups without any AI touching the logo (ADR-008): the real logo is projected onto the
// blank scenes of the local image tool (MCP-IMAGE-GENERATION, `npm start`, TOOL_PROFILE=charta).
// The tool owns the scenes (generated once, corners placed in its editor); this script only asks it for a
// control render of each brand on the latest ready scene of every preset. Free, no quota.
// Output: src/data/mockups/<slug>/<scene>.webp (git-ignored, the pictures carry trademarks). Existing files
// are kept: delete one to render it again.
// `node scripts/gen-mockups-local.mjs [slug…]`; IMAGE_TOOL_URL (default http://localhost:3333),
// IMAGE_TOOL_TOKEN if the tool has an API_TOKEN, GEN_SCENES=cards,phone to limit scenes.
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { loadEnvFile } from 'node:process';

const here = new URL('../', import.meta.url);
if (existsSync(new URL('.env.local', here))) loadEnvFile(new URL('.env.local', here));
const repo = new URL('../../', here);
const raster = await import(new URL('packages/svg-engine/dist/raster/index.js', repo).href);
const sharp = createRequire(new URL('packages/svg-engine/package.json', repo))('sharp');
const rasterizer = raster.createNodeRasterizer();

const TOOL = (process.env.IMAGE_TOOL_URL ?? 'http://localhost:3333').replace(/\/$/, '');
const HEADERS = process.env.IMAGE_TOOL_TOKEN
  ? { Authorization: `Bearer ${process.env.IMAGE_TOOL_TOKEN}` }
  : {};
// Tool preset → prototype scene key (src/lib/photos.ts). The tool has no office scene yet.
const PRESET_TO_SCENE = {
  'business-card': 'cards',
  'shop-sign': 'store',
  'tote-bag': 'tote',
  't-shirt-folded': 'tee',
  'laptop-screen': 'phone',
  'framed-poster': 'billboard',
};
const LOGO_WIDTH = 1600;

async function api(path, init = {}) {
  const response = await fetch(`${TOOL}${path}`, {
    ...init,
    headers: { ...HEADERS, ...(init.headers ?? {}) },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${path}: ${String(response.status)} ${body.slice(0, 200)}`);
  }
  return response;
}

let scenes;
try {
  scenes = await (await api('/api/scenes')).json();
} catch (error) {
  console.error(
    `Image tool unreachable at ${TOOL} (npm start in MCP-IMAGE-GENERATION): ${String(error.message ?? error)}`,
  );
  process.exit(1);
}

// Latest ready scene per preset (the tool lists the newest first)
const wanted = (process.env.GEN_SCENES ?? '').split(',').filter(Boolean);
const chosen = new Map();
for (const scene of scenes) {
  const key = PRESET_TO_SCENE[scene.preset];
  if (!key || scene.status !== 'ready' || chosen.has(key)) continue;
  if (wanted.length === 0 || wanted.includes(key)) chosen.set(key, scene.id);
}
if (chosen.size === 0) {
  console.error(
    'No ready scene in the tool: build one and place its corners in its editor (/scene-editor.html).',
  );
  process.exit(1);
}
console.log(`scenes: ${[...chosen].map(([key, id]) => `${key} = ${id}`).join(', ')}`);

const brands = JSON.parse(await readFile(new URL('src/data/brands.json', here), 'utf8'));
const only = process.argv.slice(2);
let made = 0;
let failed = 0;
for (const brand of brands.filter((b) => only.length === 0 || only.includes(b.slug))) {
  const dir = new URL(`src/data/mockups/${brand.slug}/`, here);
  await mkdir(dir, { recursive: true });
  const logo = await rasterizer.rasterize(brand.logo, LOGO_WIDTH);
  if (!logo.ok) {
    console.warn(`${brand.slug}: logo not rasterized (${logo.error.reason})`);
    failed += 1;
    continue;
  }
  const dataUri = `data:image/png;base64,${Buffer.from(logo.value.png).toString('base64')}`;
  for (const [key, sceneId] of chosen) {
    const target = new URL(`${key}.webp`, dir);
    if (existsSync(target)) continue;
    try {
      const rendered = await (
        await api(`/api/scenes/${encodeURIComponent(sceneId)}/render`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ logo: dataUri }),
        })
      ).json();
      const bytes = Buffer.from(
        await (await api(new URL(rendered.image_url).pathname)).arrayBuffer(),
      );
      await writeFile(
        target,
        await sharp(bytes).resize({ width: 1200 }).webp({ quality: 84 }).toBuffer(),
      );
      made += 1;
      console.log(`${brand.slug} / ${key}`);
    } catch (error) {
      failed += 1;
      console.warn(`${brand.slug} / ${key}: ${String(error.message ?? error).slice(0, 200)}`);
    }
  }
}
console.log(`${String(made)} mockups written, ${String(failed)} failed.`);
if (failed > 0) process.exitCode = 1;
