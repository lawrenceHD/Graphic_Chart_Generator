// Photorealistic mockups through a free, online model: FLUX.1 Kontext on Hugging Face Spaces (ZeroGPU).
// Kontext edits the image it is given, so the real logo goes in, small on a large canvas, and comes back
// printed, embroidered or lit in a photograph; it is not redrawn from a description. Free quota is a few
// minutes of GPU per day (more with a free HF account: HF_TOKEN in .env.local), so the script is resumable:
// existing files are kept and a quota error stops the run cleanly, to be resumed later.
// Output: src/data/mockups/<slug>/<scene>.webp (git-ignored, the pictures carry trademarks).
// `node scripts/gen-mockups-hf.mjs [slug…]`, GEN_SCENES=cards,store to limit scenes.
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { loadEnvFile } from 'node:process';
import { Client } from '@gradio/client';

const here = new URL('../', import.meta.url);
if (existsSync(new URL('.env.local', here))) loadEnvFile(new URL('.env.local', here));
const repo = new URL('../../', here);
const raster = await import(new URL('packages/svg-engine/dist/raster/index.js', repo).href);
const sharp = createRequire(new URL('packages/svg-engine/package.json', repo))('sharp');
const rasterizer = raster.createNodeRasterizer();

const SPACE = process.env.HF_SPACE ?? 'black-forest-labs/FLUX.1-Kontext-Dev';
const STYLE =
  'Ultra-realistic commercial photograph for a brand identity case study, medium format camera, natural soft light, physically accurate shadows, true-to-life materials, subtle film grain. Keep the logo exactly as given: same shapes, same colours, same proportions, crisp edges, no added text, no other logo.';

// Each scene: what the canvas becomes, and where the logo sits. The logo is drawn small on the canvas so it
// keeps a professional margin in the photograph.
const SCENES = [
  {
    key: 'cards',
    canvas: 'light',
    scale: 0.32,
    prompt:
      'Turn this into a photograph of two premium matte business cards lying on a warm oak desk, the front card shows this logo small and centred with generous white margins, soft window light, shallow depth of field',
  },
  {
    key: 'store',
    canvas: 'primary',
    scale: 0.3,
    prompt:
      'Turn this into a photograph of a modern shop facade at golden hour, this logo mounted as an illuminated sign above the glass entrance, people blurred walking by, 35 mm street photography',
  },
  {
    key: 'tote',
    canvas: 'light',
    scale: 0.3,
    prompt:
      'Turn this into a photograph of a natural canvas tote bag carried on the shoulder in a sunlit street, this logo screen printed on the bag, cropped at the torso, no face, editorial fashion photography',
  },
  {
    key: 'tee',
    canvas: 'primary',
    scale: 0.26,
    prompt:
      'Turn this into a studio photograph of a cotton t-shirt in this background colour, neatly folded on light concrete, this logo printed small on the chest, visible fabric texture, soft shadows',
  },
  {
    key: 'phone',
    canvas: 'light',
    scale: 0.28,
    prompt:
      'Turn this into a photograph of a hand holding a modern smartphone in a bright cafe, the screen shows a clean app home screen with this logo in the header, screen sharp, background softly blurred',
  },
  {
    key: 'billboard',
    canvas: 'primary',
    scale: 0.34,
    prompt:
      'Turn this into a photograph of a large billboard on a city building at dusk, the poster in this background colour with this logo centred and lots of empty space, warm city lights, pedestrians blurred',
  },
  {
    key: 'office',
    canvas: 'light',
    scale: 0.3,
    prompt:
      'Turn this into an architectural photograph of a minimal office reception wall, this logo mounted as brushed metal 3D letters with subtle backlight, wide angle, clean and calm',
  },
];

const hexRgb = (hex) => ({
  r: parseInt(hex.slice(1, 3), 16),
  g: parseInt(hex.slice(3, 5), 16),
  b: parseInt(hex.slice(5, 7), 16),
});

async function canvasFor(brand, scene) {
  const W = 1024;
  const H = 1024;
  const logo = await rasterizer.rasterize(brand.logo, Math.round(W * scene.scale));
  if (!logo.ok) throw new Error(`logo not rasterized: ${logo.error.reason}`);
  // The logo on its own primary would vanish when it is drawn in that colour: use the light neutral then.
  const background =
    scene.canvas === 'primary' ? brand.roles.primary.hex : brand.roles.neutralLight.hex;
  const mark = scene.canvas === 'primary' ? brand.mono.white : null;
  const art = mark ? await rasterizer.rasterize(mark, Math.round(W * scene.scale)) : logo;
  const input = art.ok ? art.value.png : logo.value.png;
  return sharp({ create: { width: W, height: H, channels: 3, background: hexRgb(background) } })
    .composite([{ input, gravity: 'centre' }])
    .png()
    .toBuffer();
}

const brands = JSON.parse(await readFile(new URL('src/data/brands.json', here), 'utf8'));
const only = process.argv.slice(2);
const wanted = (process.env.GEN_SCENES ?? '').split(',').filter(Boolean);
const options = process.env.HF_TOKEN ? { hf_token: process.env.HF_TOKEN } : {};
const client = await Client.connect(SPACE, options);
console.log(`space: ${SPACE} (${process.env.HF_TOKEN ? 'with HF account' : 'anonymous quota'})`);
let made = 0;
outer: for (const brand of brands.filter((b) => only.length === 0 || only.includes(b.slug))) {
  const dir = new URL(`src/data/mockups/${brand.slug}/`, here);
  await mkdir(dir, { recursive: true });
  for (const scene of SCENES.filter((s) => wanted.length === 0 || wanted.includes(s.key))) {
    const target = new URL(`${scene.key}.webp`, dir);
    if (existsSync(target)) continue;
    const started = Date.now();
    try {
      const input = new Blob([await canvasFor(brand, scene)], { type: 'image/png' });
      const result = await client.predict('/infer', {
        input_image: input,
        prompt: `${scene.prompt}. ${STYLE}`,
        seed: 11,
        randomize_seed: false,
        guidance_scale: 2.5,
        steps: 28,
      });
      const url = result.data?.[0]?.url;
      if (!url) throw new Error('no image in answer');
      const bytes = Buffer.from(await (await fetch(url)).arrayBuffer());
      await writeFile(
        target,
        await sharp(bytes)
          .resize({ width: 1200, withoutEnlargement: true })
          .webp({ quality: 84 })
          .toBuffer(),
      );
      made += 1;
      console.log(
        `${brand.slug} / ${scene.key}  ${String(Math.round((Date.now() - started) / 1000))} s`,
      );
    } catch (error) {
      const message = String(error?.message ?? error).slice(0, 200);
      console.warn(`${brand.slug} / ${scene.key}: ${message}`);
      if (/quota|exceeded|rate/i.test(message)) {
        console.warn('GPU quota reached: run again later (files already made are kept).');
        break outer;
      }
    }
  }
}
console.log(`${String(made)} new mockups`);
process.exit(0);
