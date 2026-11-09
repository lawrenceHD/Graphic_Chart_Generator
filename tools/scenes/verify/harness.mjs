// Browser side of tools/scenes/verify.mjs: renders scenes of apps/web/public/scenes with the real mockup-engine
// WebGL2 compositor and real logos of the curated selection, then lays the pictures out on one sheet.
import {
  createCompositor,
  directScene,
  parseScene,
  placeLogo,
  surfaceUniforms,
} from '@app/mockup-engine';
import { LOGO_SELECTION } from '../../../apps/web/src/landing/examples/data/logo-selection';

const params = new URLSearchParams(location.search);
const ids = (params.get('ids') ?? '').split(',').filter((id) => id !== '');
const columns = Number(params.get('cols') ?? '2');
const width = Number(params.get('w') ?? '900');
const offset = Number(params.get('logo') ?? '0');

const NEUTRAL_LIGHT = '#F6F1E9';
const NEUTRAL_DARK = '#14110F';

function loadImage(src) {
  const image = new Image();
  image.src = src;
  return image.decode().then(() => image);
}

async function logoTexture(src) {
  const image = await loadImage(src);
  // An SVG without intrinsic size would report 0: the library files all carry a viewBox and a size.
  const aspect = image.naturalWidth / Math.max(1, image.naturalHeight);
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = Math.max(1, Math.round(2048 / aspect));
  canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
  return { canvas, aspect };
}

async function main() {
  const rows = Math.ceil(ids.length / columns);
  const cell = Math.round((width * 1088) / 1920);
  const sheet = document.createElement('canvas');
  sheet.width = columns * width;
  sheet.height = rows * (cell + 24);
  const out = sheet.getContext('2d');
  if (out === null) throw new Error('2d');
  out.fillStyle = '#222';
  out.fillRect(0, 0, sheet.width, sheet.height);
  const gl = document.createElement('canvas');
  gl.width = 1920;
  gl.height = 1088;
  const compositor = createCompositor(gl);
  if (compositor === null) throw new Error('webgl2');
  const report = [];
  for (const [index, id] of ids.entries()) {
    const pick = LOGO_SELECTION[(index + offset) % LOGO_SELECTION.length];
    if (pick === undefined) throw new Error('no logo');
    const [first, second] = pick.palette;
    const dark = first === undefined || first === '#000000' || first === '#FFFFFF';
    const colors = {
      primary: dark ? '#E9DFD0' : first,
      accent: second !== undefined && second !== '#FFFFFF' ? second : '#C98B4A',
      neutralLight: NEUTRAL_LIGHT,
      neutralDark: NEUTRAL_DARK,
    };
    const json = await (await fetch(`/scenes/${id}/scene.json`)).json();
    const parsed = parseScene(json);
    if (!parsed.ok) {
      report.push(`${id}: INVALID ${parsed.error.issues.join(';')}`);
      continue;
    }
    const { scene, homographies } = parsed.value;
    const directions = directScene(scene, colors, [colors.primary, colors.accent]);
    const base = await loadImage(`/scenes/${id}/base.webp`);
    const logo = await logoTexture(pick.logo);
    const layers = [];
    for (const surface of scene.surfaces) {
      const direction = directions.find((entry) => entry.surfaceId === surface.id);
      const h = homographies.get(surface.id);
      if (direction === undefined || h === undefined) continue;
      const mask =
        surface.mask === undefined ? null : await loadImage(`/scenes/${id}/${surface.mask}`);
      const rect = placeLogo(surface.logoBox, logo.aspect);
      if (!rect.ok) continue;
      const uniforms = surfaceUniforms({
        homography: h,
        rect: rect.value,
        paint: direction.paint,
        tint: surface.baseTint,
        finish: direction.finish,
        material: surface.material ?? 'paper',
        light: surface.light.direction,
        foil: direction.foil ?? 'gold',
        logoWidth: logo.canvas.width,
      });
      if (uniforms !== null) layers.push({ uniforms, mask, logo: logo.canvas });
    }
    compositor.render(base, layers);
    const x = (index % columns) * width;
    const y = Math.floor(index / columns) * (cell + 24);
    out.drawImage(gl, x, y, width, cell);
    out.fillStyle = '#fff';
    out.font = '14px sans-serif';
    out.fillText(
      `${id}  +  ${pick.name}  (${String(layers.length)} surface(s))`,
      x + 6,
      y + cell + 17,
    );
    report.push(`${id}: ${pick.name} ${String(layers.length)}/${String(scene.surfaces.length)}`);
  }
  await fetch('/result', {
    method: 'POST',
    body: JSON.stringify({ png: sheet.toDataURL('image/png'), report }),
  });
}

main().catch(async (error) => {
  await fetch('/result', { method: 'POST', body: JSON.stringify({ error: String(error) }) });
});
