const RANDOM_BYTES = 10;
const MAX_TIMESTAMP = 2 ** 48;

/**
 * UUID version 7 (RFC 9562 §5.7): 48-bit Unix milliseconds, then 74 random bits. Time-ordered, so primary-key
 * indexes stay append-mostly (03_DATA_MODEL.md §1). Pure: the clock and the 10 random bytes are injected.
 */
export function uuidV7(unixMs: number, random: Uint8Array): string {
  if (!Number.isInteger(unixMs) || unixMs < 0 || unixMs >= MAX_TIMESTAMP) {
    throw new RangeError('uuidV7 needs an integer millisecond timestamp in [0, 2^48).');
  }
  if (random.length !== RANDOM_BYTES) throw new RangeError('uuidV7 needs exactly 10 random bytes.');
  const bytes = new Uint8Array(16);
  let time = unixMs;
  for (let index = 5; index >= 0; index -= 1) {
    bytes[index] = time % 256;
    time = Math.floor(time / 256);
  }
  bytes.set(random, 6);
  bytes[6] = 0x70 | ((bytes[6] ?? 0) & 0x0f); // version 7
  bytes[8] = 0x80 | ((bytes[8] ?? 0) & 0x3f); // variant 10
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
