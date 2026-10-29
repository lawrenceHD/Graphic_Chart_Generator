import { IndexedReferenceSchema, type IndexedReference } from '@app/contracts';

export interface ReferenceIndex {
  references: IndexedReference[];
  // 1-based line numbers that failed validation: reported, never silently dropped.
  rejected: number[];
}

// Parses index.jsonl written by tools/references/analyze.py. Every line is untrusted model output.
export function parseReferenceIndex(text: string): ReferenceIndex {
  const valid: { line: number; reference: IndexedReference }[] = [];
  const rejected: number[] = [];
  text.split('\n').forEach((raw, index) => {
    const line = raw.trim();
    if (line.length === 0) return;
    let value: unknown;
    try {
      value = JSON.parse(line);
    } catch {
      rejected.push(index + 1);
      return;
    }
    const parsed = IndexedReferenceSchema.safeParse(value);
    if (parsed.success) valid.push({ line: index + 1, reference: parsed.data });
    else rejected.push(index + 1);
  });
  // One embedding size for the whole library: the most common one (ties: the smallest).
  const counts = new Map<number, number>();
  for (const { reference } of valid) {
    const size = reference.embedding.length;
    counts.set(size, (counts.get(size) ?? 0) + 1);
  }
  const dimensions = [...counts].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0];
  const references: IndexedReference[] = [];
  const files = new Set<string>();
  for (const { line, reference } of valid) {
    // A reference indexed twice (resumed run) counts once.
    if (reference.embedding.length !== dimensions || files.has(reference.file)) {
      rejected.push(line);
      continue;
    }
    files.add(reference.file);
    references.push(reference);
  }
  return { references, rejected: rejected.sort((a, b) => a - b) };
}
