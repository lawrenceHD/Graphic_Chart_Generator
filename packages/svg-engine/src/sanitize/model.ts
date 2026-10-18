import type { AssetError, AssetErrorCode } from '@app/contracts';

// 05_ENGINES.md §3.1 and §3.5.
export const LIMITS = {
  bytes: 5 * 1024 * 1024,
  depth: 64,
  nodes: 50_000,
  attributesPerElement: 64,
  valueLength: 10_000,
  // Geometry of real logos exceeds 10 000 characters (47 of the 1 432 reference logos): bounded by the
  // 5 MB file limit only. Owner delegation 2026-10-18, to be reported in 05_ENGINES.md §3.1.
  geometryValueLength: 5 * 1024 * 1024,
  useDepth: 8,
  expandedNodes: 100_000,
} as const;

export const SVG_NS = 'http://www.w3.org/2000/svg';
export const XLINK_NS = 'http://www.w3.org/1999/xlink';

export type WarningCode =
  | 'DROPPED_ELEMENT'
  | 'DROPPED_ATTRIBUTE'
  | 'DUPLICATE_ID'
  | 'MISSING_REFERENCE'
  | 'VIEWBOX_NEEDS_BBOX';

export interface SvgWarning {
  readonly code: WarningCode;
  /** Element or attribute name only: never a user-supplied value. */
  readonly detail: string;
}

/** Element as read from the file, before any filtering. */
export interface RawElement {
  readonly uri: string;
  readonly local: string;
  readonly attributes: readonly RawAttribute[];
  readonly children: readonly RawNode[];
}
export interface RawAttribute {
  readonly uri: string;
  readonly prefix: string;
  readonly local: string;
  readonly value: string;
}
export type RawNode = RawElement | string;

/** Rebuilt element: whitelisted names and checked values only. */
export interface CleanElement {
  readonly name: string;
  readonly attributes: Map<string, string>;
  /** Properties set by the element's own style attribute: they win over <style> rules. */
  readonly styled: ReadonlySet<string>;
  readonly children: CleanNode[];
}
export type CleanNode = CleanElement | { readonly text: string };

export const isCleanElement = (node: CleanNode): node is CleanElement => 'name' in node;

export function assetError(code: AssetErrorCode, reason: string, hint?: string): AssetError {
  return hint === undefined ? { code, reason } : { code, reason, hint };
}

const LOCAL_REFERENCE = /^#([A-Za-z_][\w.-]*)$/;
const LOCAL_URL = /^url\(\s*(['"]?)#([A-Za-z_][\w.-]*)\1\s*\)$/;

/** Target id of a local `#id` reference, otherwise undefined. */
export function localReference(value: string): string | undefined {
  return LOCAL_REFERENCE.exec(value.trim())?.[1];
}

/** Target id of a local `url(#id)` value, otherwise undefined. */
export function localUrl(value: string): string | undefined {
  return LOCAL_URL.exec(value.trim())?.[2];
}

// Dangerous schemes are matched after removing whitespace and control characters, which browsers ignore
// inside URLs (`JaVa\tScRiPt:`); numeric character references are already decoded by the XML parser.
// `data:` only acts as a scheme at the start of a value or of a url(): matching it anywhere would refuse
// harmless editor labels such as `metadata:layer`.
export function hasDangerousScheme(value: string): boolean {
  const compact = value.replace(/[\s\u0000-\u001f]+/g, '').toLowerCase();
  return (
    compact.includes('javascript:') ||
    compact.includes('vbscript:') ||
    /(^|url\(['"]?)data:/.test(compact)
  );
}
