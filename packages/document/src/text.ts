const MAX_DEPTH = 64;

// Commands normalise user text to NFC (docs/04_API_CONTRACTS.md §4) before the document schema checks it.
// Keys are copied with defineProperty so that a `__proto__` key stays an own key that the schema rejects,
// instead of silently replacing the prototype.
export function normalizeNfcDeep(value: unknown, depth = 0): unknown {
  if (typeof value === 'string') return value.normalize('NFC');
  if (depth >= MAX_DEPTH || typeof value !== 'object' || value === null) return value;
  if (Array.isArray(value)) {
    return value.map((item: unknown) => normalizeNfcDeep(item, depth + 1));
  }
  if (Reflect.getPrototypeOf(value) !== Object.prototype) return value;

  const normalized = {};
  for (const [key, entry] of Object.entries(value)) {
    Object.defineProperty(normalized, key.normalize('NFC'), {
      value: normalizeNfcDeep(entry, depth + 1),
      enumerable: true,
      writable: true,
      configurable: true,
    });
  }
  return normalized;
}
