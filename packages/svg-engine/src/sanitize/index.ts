import type { AssetError } from '@app/contracts';
import { err, ok, type Result } from '@app/kernel';
import { decodeSvgText } from './decode.js';
import { filterTree } from './filter.js';
import {
  isCleanElement,
  type CleanElement,
  type CleanElement as SvgElement,
  type SvgWarning,
} from './model.js';
import { parseSvg } from './parse.js';
import { normalizeNestedViewBoxes, normalizeRoot, serialize } from './serialize.js';
import { checkUseExpansion, inlineRules, repairReferences } from './structure.js';

export type { SvgWarning, WarningCode } from './model.js';
export type { CleanElement as SvgElement, CleanNode as SvgNode } from './model.js';
export { isCleanElement as isSvgElement } from './model.js';

export interface SanitizeStats {
  readonly inputBytes: number;
  readonly outputBytes: number;
  readonly elements: number;
}

export interface SanitizedSvg {
  readonly svg: string;
  readonly warnings: readonly SvgWarning[];
  readonly stats: SanitizeStats;
}

const countElements = (element: CleanElement): number =>
  1 + element.children.filter(isCleanElement).reduce((sum, child) => sum + countElements(child), 0);

/**
 * Allowlist SVG sanitizer (05_ENGINES.md §3, SEC-14). Pure: the clean tree built here is local, so the
 * in-place repairs below never touch caller data.
 */
export function sanitizeSvg(bytes: Uint8Array): Result<SanitizedSvg, AssetError> {
  const tree = sanitizeSvgTree(bytes);
  if (!tree.ok) return tree;
  const { root, warnings } = tree.value;
  const svg = serialize(root);
  return ok({
    svg,
    warnings,
    stats: {
      inputBytes: bytes.length,
      outputBytes: new TextEncoder().encode(svg).length,
      elements: countElements(root),
    },
  });
}

/** Clean tree of an SVG, for pure transformations (logo-kit); serialize it with serializeSvg. */
export interface SanitizedTree {
  readonly root: SvgElement;
  readonly warnings: readonly SvgWarning[];
}

export function sanitizeSvgTree(bytes: Uint8Array): Result<SanitizedTree, AssetError> {
  const text = decodeSvgText(bytes);
  if (!text.ok) return text;
  const raw = parseSvg(text.value);
  if (!raw.ok) return raw;
  const filtered = filterTree(raw.value);
  if (!filtered.ok) return filtered;

  const { root, rules } = filtered.value;
  const warnings = [...filtered.value.warnings];
  inlineRules(root, rules);
  repairReferences(root, warnings);
  const expansion = checkUseExpansion(root);
  if (!expansion.ok) return err(expansion.error);
  normalizeRoot(root, warnings);
  normalizeNestedViewBoxes(root);
  return ok({ root, warnings });
}

/** Deterministic serialisation of a clean tree (attributes sorted, root namespace added). */
export function serializeSvg(root: SvgElement): string {
  return serialize(root);
}
