import { err, ok, type Result } from '@app/kernel';
import {
  sanitizeSvg,
  sanitizeSvgTree,
  serializeSvg,
  type SvgElement,
  type SvgNode,
} from '@app/svg-engine';

export type ComposeError = 'INVALID_SVG';

export const svgElement = (
  name: string,
  attributes: Readonly<Record<string, string>>,
  children: SvgNode[] = [],
): SvgElement => ({
  name,
  attributes: new Map(Object.entries(attributes)),
  styled: new Set(),
  children,
});

/** Children of the logo's root, i.e. the artwork in its own user coordinates. */
export function artworkOf(svg: string): Result<SvgNode[], ComposeError> {
  const tree = sanitizeSvgTree(new TextEncoder().encode(svg));
  return tree.ok ? ok(tree.value.root.children) : err('INVALID_SVG');
}

/** Builds a square document and returns it as a sanitizeSvg output (requirement of T-012 test 4). */
export function document(size: number, children: SvgNode[]): Result<string, ComposeError> {
  const root = svgElement('svg', { viewBox: `0 0 ${String(size)} ${String(size)}` }, children);
  return finish(root);
}

export function finish(root: SvgElement): Result<string, ComposeError> {
  const canonical = sanitizeSvg(new TextEncoder().encode(serializeSvg(root)));
  return canonical.ok ? ok(canonical.value.svg) : err('INVALID_SVG');
}
