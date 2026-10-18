import type { AssetError } from '@app/contracts';
import { err, ok, type Result } from '@app/kernel';
import type { StyleRule } from './css.js';
import {
  assetError,
  isCleanElement,
  LIMITS,
  localReference,
  localUrl,
  type CleanElement,
  type SvgWarning,
} from './model.js';

function* elements(root: CleanElement): Generator<CleanElement> {
  yield root;
  for (const child of root.children) if (isCleanElement(child)) yield* elements(child);
}

/** §3.4: inlines `<style>` rules by specificity then source order, under the element's own style. */
export function inlineRules(root: CleanElement, rules: readonly StyleRule[]): void {
  const ordered = [...rules].sort((a, b) => a.specificity - b.specificity || a.order - b.order);
  for (const element of elements(root)) {
    const classes = new Set((element.attributes.get('class') ?? '').split(/\s+/).filter(Boolean));
    const id = element.attributes.get('id');
    for (const rule of ordered) {
      const matches =
        (rule.kind === 'type' && rule.name === element.name) ||
        (rule.kind === 'class' && classes.has(rule.name)) ||
        (rule.kind === 'id' && rule.name === id);
      if (!matches) continue;
      for (const [property, value] of rule.declarations) {
        if (!element.styled.has(property)) element.attributes.set(property, value);
      }
    }
    element.attributes.delete('class');
  }
}

/** §3.5: unique ids, then removal of references to missing ids. */
export function repairReferences(root: CleanElement, warnings: SvgWarning[]): void {
  const ids = new Set<string>();
  for (const element of elements(root)) {
    const id = element.attributes.get('id');
    if (id === undefined) continue;
    if (!ids.has(id)) {
      ids.add(id);
      continue;
    }
    let suffix = 2;
    while (ids.has(`${id}-${String(suffix)}`)) suffix += 1;
    element.attributes.set('id', `${id}-${String(suffix)}`);
    ids.add(`${id}-${String(suffix)}`);
    warnings.push({ code: 'DUPLICATE_ID', detail: element.name });
  }
  for (const element of elements(root)) {
    for (const [name, value] of element.attributes) {
      const target = name === 'href' ? localReference(value) : localUrl(value);
      if (target !== undefined && !ids.has(target)) {
        element.attributes.delete(name);
        warnings.push({ code: 'MISSING_REFERENCE', detail: `${element.name}@${name}` });
      }
    }
  }
}

interface Expansion {
  readonly nodes: number;
  readonly useDepth: number;
}

/** §3.5: `<use>` cycles are refused; nesting ≤ 8 and expanded size ≤ 100 000 nodes. */
export function checkUseExpansion(root: CleanElement): Result<void, AssetError> {
  const byId = new Map<string, CleanElement>();
  for (const element of elements(root)) {
    const id = element.attributes.get('id');
    if (id !== undefined) byId.set(id, element);
  }
  const memo = new Map<CleanElement, Expansion>();
  const active = new Set<CleanElement>();
  const tooComplex = (reason: string): Result<never, AssetError> =>
    err(assetError('ASSET_SVG_TOO_COMPLEX', reason));

  function expand(element: CleanElement): Result<Expansion, AssetError> {
    const known = memo.get(element);
    if (known) return ok(known);
    if (active.has(element)) return tooComplex('<use> cycle');
    active.add(element);
    let nodes = 1;
    let useDepth = 0;
    const targetId =
      element.name === 'use' ? localReference(element.attributes.get('href') ?? '') : undefined;
    const target = targetId === undefined ? undefined : byId.get(targetId);
    const parts = [...element.children.filter(isCleanElement), ...(target ? [target] : [])];
    for (const part of parts) {
      const child = expand(part);
      if (!child.ok) return child;
      nodes += child.value.nodes;
      useDepth = Math.max(useDepth, child.value.useDepth + (part === target ? 1 : 0));
      if (nodes > LIMITS.expandedNodes) return tooComplex('<use> expansion budget');
      if (useDepth > LIMITS.useDepth) return tooComplex('<use> nesting too deep');
    }
    active.delete(element);
    const expansion = { nodes, useDepth };
    memo.set(element, expansion);
    return ok(expansion);
  }
  const result = expand(root);
  return result.ok ? ok(undefined) : result;
}
