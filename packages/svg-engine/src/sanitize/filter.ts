import type { AssetError } from '@app/contracts';
import { err, ok, type Result } from '@app/kernel';
import {
  ALLOWED_ATTRIBUTES,
  ALLOWED_ELEMENTS,
  FORBIDDEN_ELEMENTS,
  SILENTLY_DROPPED_ELEMENTS,
  TEXT_CONTENT_ELEMENTS,
  TEXT_ELEMENTS,
} from './allowlists.js';
import { parseStyleAttribute, parseStylesheet, type StyleRule } from './css.js';
import {
  assetError,
  hasDangerousScheme,
  localReference,
  localUrl,
  SVG_NS,
  XLINK_NS,
  type CleanElement,
  type CleanNode,
  type RawAttribute,
  type RawElement,
  type SvgWarning,
} from './model.js';

export interface Filtered {
  readonly root: CleanElement;
  readonly rules: StyleRule[];
  readonly warnings: SvgWarning[];
}

const forbidden = (reason: string): AssetError => assetError('ASSET_SVG_FORBIDDEN_CONTENT', reason);

// Returns the attribute name kept in the output, `null` to drop silently, or an error.
function attributeName(attribute: RawAttribute): string | null {
  if (attribute.prefix === 'xmlns' || attribute.local === 'xmlns') return null;
  if (attribute.uri === XLINK_NS) return attribute.local === 'href' ? 'href' : null;
  // Other namespaces: editors (inkscape, sodipodi, sketch…) and xml:space — metadata only.
  return attribute.uri === '' ? attribute.local : null;
}

function filterAttributes(
  raw: RawElement,
  warnings: SvgWarning[],
): Result<{ attributes: Map<string, string>; styled: Set<string> }, AssetError> {
  const attributes = new Map<string, string>();
  let style: ReadonlyMap<string, string> = new Map();
  for (const attribute of raw.attributes) {
    // Checked before the namespace test: a handler or a javascript: URL is never harmless.
    if (/^on/i.test(attribute.local)) return err(forbidden('event handler attribute'));
    if (hasDangerousScheme(attribute.value)) return err(forbidden('dangerous URL scheme'));
    const name = attributeName(attribute);
    if (name === null) continue;
    let value = attribute.value;
    if (name === 'href') {
      const target = localReference(value);
      if (target === undefined) return err(forbidden('non-local href'));
      value = `#${target}`;
    } else if (/url\(/i.test(value)) {
      const target = localUrl(value);
      if (target === undefined) return err(forbidden('non-local url()'));
      value = `url(#${target})`;
    }
    if (name === 'style') {
      const parsed = parseStyleAttribute(value);
      if (!parsed.ok) return parsed;
      style = parsed.value;
    } else if (ALLOWED_ATTRIBUTES.has(name)) {
      attributes.set(name, value);
    } else {
      warnings.push({ code: 'DROPPED_ATTRIBUTE', detail: `${raw.local}@${name}` });
    }
  }
  // A style declaration overrides the presentation attribute of the same name (CSS cascade).
  for (const [property, value] of style) attributes.set(property, value);
  return ok({ attributes, styled: new Set(style.keys()) });
}

function filterElement(
  raw: RawElement,
  rules: StyleRule[],
  warnings: SvgWarning[],
): Result<CleanElement | null, AssetError> {
  const lower = raw.local.toLowerCase();
  if (FORBIDDEN_ELEMENTS.has(lower)) return err(forbidden(`<${lower}>`));
  if (TEXT_ELEMENTS.has(lower)) {
    return err(
      assetError('ASSET_SVG_UNSUPPORTED_FEATURE', `<${lower}>`, 'convert-text-to-outlines'),
    );
  }
  // Foreign namespaces (editors, XHTML…) are dropped with their whole subtree, never rendered.
  if (raw.uri !== SVG_NS || SILENTLY_DROPPED_ELEMENTS.has(raw.local)) return ok(null);
  if (raw.local === 'style') {
    const parsed = parseStylesheet(
      raw.children.filter((child) => typeof child === 'string').join(''),
    );
    if (!parsed.ok) return parsed;
    rules.push(...parsed.value.map((rule) => ({ ...rule, order: rules.length + rule.order })));
    return ok(null);
  }
  if (!ALLOWED_ELEMENTS.has(raw.local)) {
    warnings.push({ code: 'DROPPED_ELEMENT', detail: raw.local });
    return ok(null);
  }
  const attributes = filterAttributes(raw, warnings);
  if (!attributes.ok) return attributes;
  const children: CleanNode[] = [];
  for (const child of raw.children) {
    if (typeof child === 'string') {
      if (TEXT_CONTENT_ELEMENTS.has(raw.local) && child.trim() !== '')
        children.push({ text: child });
      continue;
    }
    const filtered = filterElement(child, rules, warnings);
    if (!filtered.ok) return filtered;
    if (filtered.value) children.push(filtered.value);
  }
  return ok({ name: raw.local, ...attributes.value, children });
}

/** §3.2–§3.4: rebuilds the tree from whitelisted elements and attributes; `<style>` rules are returned. */
export function filterTree(raw: RawElement): Result<Filtered, AssetError> {
  if (raw.uri !== SVG_NS || raw.local !== 'svg') {
    return err(assetError('ASSET_TYPE_UNSUPPORTED', 'root is not an SVG-namespace <svg>'));
  }
  const rules: StyleRule[] = [];
  const warnings: SvgWarning[] = [];
  const root = filterElement(raw, rules, warnings);
  if (!root.ok) return root;
  if (!root.value) return err(assetError('ASSET_TYPE_UNSUPPORTED', 'empty root'));
  return ok({ root: root.value, rules, warnings });
}
