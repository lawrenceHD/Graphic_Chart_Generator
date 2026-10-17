import { err, ok, type Result } from '@app/kernel';
import type { ApplyInput } from './command-schema.js';
import { type BrandDocument, MAX_DOCUMENT_BYTES, type Page } from './schema.js';
import type { CommandError } from './commands.js';

export type OperationResult = Result<
  { readonly doc: BrandDocument; readonly inverse: ApplyInput },
  CommandError
>;

export function success(document: BrandDocument, inverse: ApplyInput): OperationResult {
  return ok({ doc: document, inverse });
}

// ADR-018: an omitted expect always matches; null stands for an absent value.
export function expectationFails(expected: unknown, current: unknown): boolean {
  return expected !== undefined && !sameJson(expected, current ?? null);
}

export function expectationFailed(): OperationResult {
  return err({ code: 'EXPECTATION_FAILED' });
}

// Structural equality of JSON values, independent of object key order.
export function sameJson(left: unknown, right: unknown): boolean {
  if (left === right) {
    return true;
  }
  if (typeof left !== 'object' || typeof right !== 'object' || left === null || right === null) {
    return false;
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((item: unknown, index) => sameJson(item, right[index]))
    );
  }
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every(
      (key) =>
        Object.hasOwn(right, key) && sameJson(Reflect.get(left, key), Reflect.get(right, key)),
    )
  );
}

export function isTooLarge(document: BrandDocument): boolean {
  return new TextEncoder().encode(JSON.stringify(document)).length > MAX_DOCUMENT_BYTES;
}

export function replacePage(
  document: BrandDocument,
  pageId: string,
  update: (page: Page) => Page,
): BrandDocument {
  return {
    ...document,
    pages: document.pages.map((page) => (page.id === pageId ? update(page) : page)),
  };
}

export function sortPages(pages: readonly Page[]): Page[] {
  return [...pages].sort((left, right) =>
    left.position < right.position ? -1 : left.position > right.position ? 1 : 0,
  );
}

export function omitDataKey(data: Page['data'], excludedKey: string): Page['data'] {
  const remaining: Page['data'] = {};
  for (const key of Object.keys(data)) {
    if (key !== excludedKey) {
      const descriptor = Object.getOwnPropertyDescriptor(data, key);
      if (descriptor && 'value' in descriptor) {
        remaining[key] = descriptor.value;
      }
    }
  }
  return remaining;
}

export function getFoilMetal(value: unknown): unknown {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return undefined;
  }
  const prototype = Reflect.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    return undefined;
  }
  if (!Object.hasOwn(value, 'foilMetal')) {
    return undefined;
  }
  return Reflect.get(value, 'foilMetal');
}
