import { describe, expect, it } from 'vitest';
import { uuidV7 } from './uuid.js';

const RANDOM = new Uint8Array([0xff, 0xee, 0xdd, 0xcc, 0xbb, 0xaa, 0x99, 0x88, 0x77, 0x66]);

describe('uuidV7 (RFC 9562 §5.7)', () => {
  it('lays out the 48-bit timestamp, version 7, variant 10 and the random bits', () => {
    // 0x017F22E279B0 ms = 2022-02-22T19:22:22.000Z, the RFC example timestamp.
    expect(uuidV7(0x017f22e279b0, RANDOM)).toBe('017f22e2-79b0-7fee-9dcc-bbaa99887766');
  });

  it('sorts by creation time, which keeps index inserts ordered', () => {
    const earlier = uuidV7(1_700_000_000_000, RANDOM);
    const later = uuidV7(1_700_000_000_001, new Uint8Array(10));
    expect(earlier < later).toBe(true);
  });

  it('refuses inputs that cannot form a valid identifier', () => {
    expect(() => uuidV7(-1, RANDOM)).toThrow(RangeError);
    expect(() => uuidV7(2 ** 48, RANDOM)).toThrow(RangeError);
    expect(() => uuidV7(1.5, RANDOM)).toThrow(RangeError);
    expect(() => uuidV7(0, new Uint8Array(9))).toThrow(RangeError);
  });
});
