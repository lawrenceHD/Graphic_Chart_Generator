import { describe, expect, it } from 'vitest';
import { err, isErr, isOk, ok } from './result.js';
import type { Result } from './result.js';

function parsePositive(input: number): Result<number, 'NOT_POSITIVE'> {
  return input > 0 ? ok(input) : err('NOT_POSITIVE');
}

describe('Result', () => {
  it('ok carries the value and is recognised as a success', () => {
    const result = parsePositive(3);
    expect(result).toEqual({ ok: true, value: 3 });
    expect(isOk(result)).toBe(true);
    expect(isErr(result)).toBe(false);
  });

  it('err carries the error and is recognised as a failure', () => {
    const result = parsePositive(-1);
    expect(result).toEqual({ ok: false, error: 'NOT_POSITIVE' });
    expect(isErr(result)).toBe(true);
    expect(isOk(result)).toBe(false);
  });

  it('narrows the union so the value or the error can be read', () => {
    const success = parsePositive(5);
    const failure = parsePositive(0);
    expect(isOk(success) ? success.value * 2 : null).toBe(10);
    expect(isErr(failure) ? failure.error : null).toBe('NOT_POSITIVE');
  });

  it('produces frozen results that callers cannot mutate', () => {
    expect(Object.isFrozen(ok({ a: 1 }))).toBe(true);
    expect(Object.isFrozen(err('E'))).toBe(true);
  });
});
