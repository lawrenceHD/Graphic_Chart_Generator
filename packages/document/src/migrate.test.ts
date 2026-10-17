import { describe, expect, it } from 'vitest';
import { migrate } from './migrate.js';
import { deepFreeze, makeDocument } from './test-fixtures.js';

describe('migrate', () => {
  it('reports a future schema version without inspecting its body', () => {
    expect(migrate({ schemaVersion: 2, value: 'private' })).toEqual({
      ok: false,
      error: { code: 'UNKNOWN_SCHEMA_VERSION', version: 2 },
    });
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

  it('returns the exact valid version 1 instance without mutating it', () => {
    const document = deepFreeze(makeDocument());

    const result = migrate(document);

    expect(result).toEqual({ ok: true, value: document });
    if (result.ok) {
      expect(result.value).toBe(document);
    }
  });
});
