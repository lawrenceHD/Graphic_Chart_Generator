// The engine keeps outlines only (05 §3, ASSET_SVG_UNSUPPORTED_FEATURE): live text would be drawn with
// whatever font the server has. Detected before upload, so the designer can fix the export, or convert
// the logo here with the fonts installed on this computer.
const TEXT_ELEMENT = /<(?:text|tspan|textPath)[\s>/]/i;
const FONT_DECLARATION = /font-family\s*(?::\s*([^;}"<]+)|=\s*"([^"]*)"|=\s*'([^']*)')/gi;
const GENERIC = new Set(['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui']);

const clean = (name: string): string =>
  name
    .trim()
    .replace(/^["']|["']$/g, '')
    .trim();
const normalised = (name: string): string => name.toLowerCase().replace(/[\s_-]/g, '');

/** Fonts of each declaration: the last named family (Illustrator writes "PostScriptName, Family Name"). */
function declaredFonts(svg: string): string[] {
  const fonts = new Map<string, string>();
  for (const match of svg.matchAll(FONT_DECLARATION)) {
    const families = (match[1] ?? match[2] ?? match[3] ?? '')
      .split(',')
      .map(clean)
      .filter((name) => name.length > 0 && !GENERIC.has(name.toLowerCase()));
    const family = families.at(-1);
    if (family !== undefined && !fonts.has(normalised(family)))
      fonts.set(normalised(family), family);
  }
  return [...fonts.values()];
}

export function findLiveText(svg: string): { readonly fonts: readonly string[] } | null {
  return TEXT_ELEMENT.test(svg) ? { fonts: declaredFonts(svg) } : null;
}
