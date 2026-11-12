import { describe, expect, it } from 'vitest';
import { migrate } from './migrate.js';
import { BrandDocumentSchema, CURRENT_SCHEMA_VERSION } from './schema.js';
import { deepFreeze, makeDocument } from './test-fixtures.js';

describe('migrate', () => {
  it('reports a future schema version without inspecting its body', () => {
    expect(migrate({ schemaVersion: 3, value: 'private' })).toEqual({
      ok: false,
      error: { code: 'UNKNOWN_SCHEMA_VERSION', version: 3 },
    });
  });

  it('is at version 2 since ADR-036 (brand.tagline and brand.contact)', () => {
    expect(CURRENT_SCHEMA_VERSION).toBe(2);
    expect(makeDocument().schemaVersion).toBe(2);
  });

  it('migrates a version 1 document to version 2, changing only the number', () => {
    const current = makeDocument();
    const version1 = deepFreeze({ ...current, schemaVersion: 1 });

    const result = migrate(version1);

    expect(result).toEqual({ ok: true, value: current });
    expect(version1.schemaVersion).toBe(1);
  });

  it('refuses a version 1 document that carries fields version 1 never had', () => {
    const current = makeDocument();
    const version1 = {
      ...current,
      schemaVersion: 1,
      brand: { ...current.brand, tagline: 'Le goût du marché' },
    };

    const result = migrate(version1);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('INVALID_DOCUMENT');
  });

  it('no longer reads a version 1 document as current without migrate', () => {
    expect(BrandDocumentSchema.safeParse({ ...makeDocument(), schemaVersion: 1 }).success).toBe(
      false,
    );
  });

  it.each([0, '1'])('rejects unsupported schema version %s', (version) => {
    const result = migrate({ schemaVersion: version });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toEqual({ code: 'UNKNOWN_SCHEMA_VERSION', version });
    }
  });

  it.each([{}, null])('reports a missing schema version for %s', (input) => {
    expect(migrate(input)).toEqual({
      ok: false,
      error: { code: 'INVALID_DOCUMENT', issues: ['schemaVersion manquant'] },
    });
  });

  it('reports validation paths but never includes rejected values', () => {
    const document = makeDocument();
    const rejectedValue = '<script>private-marker</script>';
    document.brand.name = rejectedValue;
    const result = migrate(document);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('INVALID_DOCUMENT');
      if (result.error.code === 'INVALID_DOCUMENT') {
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues.join(' ')).not.toContain(rejectedValue);
        expect(result.error.issues.join(' ')).toContain('brand.name');
      }
    }
  });

  it('returns the exact valid current instance without mutating it', () => {
    const document = deepFreeze(makeDocument());

    const result = migrate(document);

    expect(result).toEqual({ ok: true, value: document });
    if (result.ok) {
      expect(result.value).toBe(document);
    }
  });
});
