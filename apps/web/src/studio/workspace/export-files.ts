import type { BrandView, ColorRole } from './brand-view';
import { COLOR_ROLES } from './brand-view';
import { buildScale } from '../../brand/color';

// Files of the export dialog, built from the document only. Formats: CSS custom properties, a Tailwind v4
// @theme block, and W3C design tokens (DTCG) that Figma imports as variables (Tokens Studio, Figma plugins).
const slug = (role: ColorRole): string =>
  role.replace(/[A-Z]/gu, (letter) => `-${letter.toLowerCase()}`);

export function fileStem(name: string): string {
  const stem = name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-|-$/gu, '');
  return stem === '' ? 'brand' : stem;
}

export function cssTokens(view: BrandView): string {
  const scale = buildScale(view.colors.primary)
    .map((step) => `  --color-primary-${String(step.step)}: ${step.hex};`)
    .join('\n');
  return [
    `/* ${view.name} — design tokens (Charta) */`,
    ':root {',
    ...COLOR_ROLES.map((role) => `  --color-${slug(role)}: ${view.colors[role]};`),
    scale,
    `  --font-display: ${view.pairing.display.css};`,
    `  --font-text: ${view.pairing.text.css};`,
    `  --logo-clear-space: ${String(view.rules.clearSpaceRatio)};`,
    `  --logo-min-size: ${String(view.rules.minSizePx)}px;`,
    '}',
    '',
  ].join('\n');
}

export function tailwindTheme(view: BrandView): string {
  return [
    `/* ${view.name} — Tailwind CSS v4 theme (Charta) */`,
    '@theme {',
    ...COLOR_ROLES.map((role) => `  --color-${slug(role)}: ${view.colors[role]};`),
    `  --font-display: ${view.pairing.display.css};`,
    `  --font-sans: ${view.pairing.text.css};`,
    '}',
    '',
  ].join('\n');
}

export function dtcgTokens(view: BrandView): string {
  const color = Object.fromEntries(
    COLOR_ROLES.map((role) => [slug(role), { $type: 'color', $value: view.colors[role] }]),
  );
  const scale = Object.fromEntries(
    buildScale(view.colors.primary).map((step) => [
      String(step.step),
      { $type: 'color', $value: step.hex },
    ]),
  );
  return `${JSON.stringify(
    {
      $description: `${view.name} — design tokens (Charta)`,
      color: { ...color, 'primary-scale': scale },
      font: {
        display: { $type: 'fontFamily', $value: view.pairing.display.name },
        text: { $type: 'fontFamily', $value: view.pairing.text.name },
      },
      logo: {
        'clear-space': { $type: 'number', $value: view.rules.clearSpaceRatio },
        'min-size': { $type: 'dimension', $value: `${String(view.rules.minSizePx)}px` },
      },
    },
    null,
    2,
  )}\n`;
}

/** Starts a download of generated text in the browser. */
export function download(fileName: string, text: string, type: string): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  // Attached for the click: some browsers ignore a detached link.
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}
