import {
  isCleanElement,
  SVG_NS,
  type CleanElement,
  type CleanNode,
  type SvgWarning,
} from './model.js';

const NUMBER = /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i;
const LENGTH = /^\s*((?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)\s*(px)?\s*$/i;

function validViewBox(value: string | undefined): string | undefined {
  const parts = (value ?? '').trim().split(/[\s,]+/);
  if (parts.length !== 4 || !parts.every((part) => NUMBER.test(part))) return undefined;
  const [, , width, height] = parts.map(Number);
  return width !== undefined && height !== undefined && width > 0 && height > 0
    ? parts.join(' ')
    : undefined;
}

/** §3.6: mandatory viewBox (from width/height when absent), no root width/height. */
export function normalizeRoot(root: CleanElement, warnings: SvgWarning[]): void {
  const attributes = root.attributes;
  let viewBox = validViewBox(attributes.get('viewBox'));
  if (viewBox === undefined) {
    const width = LENGTH.exec(attributes.get('width') ?? '')?.[1];
    const height = LENGTH.exec(attributes.get('height') ?? '')?.[1];
    if (width !== undefined && height !== undefined && Number(width) > 0 && Number(height) > 0) {
      viewBox = `0 0 ${String(Number(width))} ${String(Number(height))}`;
    }
  }
  attributes.delete('width');
  attributes.delete('height');
  if (viewBox === undefined) {
    attributes.delete('viewBox');
    // The bounding box needs rasterisation (T-008, ADR-016): the caller computes it.
    warnings.push({ code: 'VIEWBOX_NEEDS_BBOX', detail: 'svg' });
  } else {
    attributes.set('viewBox', viewBox);
  }
}

const escapeAttribute = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const escapeText = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function serializeNode(node: CleanNode, isRoot: boolean): string {
  if (!isCleanElement(node)) return escapeText(node.text);
  // Sorted attributes make the output deterministic and sanitize(sanitize(x)) identical.
  const attributes = [...node.attributes].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const head = isRoot ? [` xmlns="${SVG_NS}"`] : [];
  const rendered = head.concat(
    attributes.map(([name, value]) => ` ${name}="${escapeAttribute(value)}"`),
  );
  const children = node.children.map((child) => serializeNode(child, false)).join('');
  return children === ''
    ? `<${node.name}${rendered.join('')}/>`
    : `<${node.name}${rendered.join('')}>${children}</${node.name}>`;
}

/** UTF-8 SVG rebuilt from the clean tree; the input text is never reused. */
export function serialize(root: CleanElement): string {
  return serializeNode(root, true);
}
