import { argon2, randomBytes, timingSafeEqual } from 'node:crypto';

// SEC-01: Argon2id with the OWASP minimum (19 MiB, 2 passes, 1 lane), native to Node 24 (spike T-013):
// no dependency. Stored as a PHC string so parameters can be raised later without breaking old hashes.
const MEMORY_KIB = 19_456;
const PASSES = 2;
const PARALLELISM = 1;
const SALT_BYTES = 16;
const TAG_BYTES = 32;
const PHC = /^\$argon2id\$v=19\$m=(\d+),t=(\d+),p=(\d+)\$([A-Za-z0-9+/]+)\$([A-Za-z0-9+/]+)$/;

const encode = (bytes: Uint8Array): string =>
  Buffer.from(bytes).toString('base64').replace(/=+$/, '');

function derive(
  password: string,
  salt: Uint8Array,
  memory: number,
  passes: number,
  parallelism: number,
) {
  return new Promise<Uint8Array>((resolve, reject) => {
    argon2(
      'argon2id',
      { message: password, nonce: salt, memory, passes, parallelism, tagLength: TAG_BYTES },
      (error, key) => {
        if (error) reject(error);
        else resolve(key);
      },
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const key = await derive(password, salt, MEMORY_KIB, PASSES, PARALLELISM);
  return `$argon2id$v=19$m=${String(MEMORY_KIB)},t=${String(PASSES)},p=${String(PARALLELISM)}$${encode(salt)}$${encode(key)}`;
}

/** Constant-time check; any malformed, foreign or weakened hash is simply a mismatch. */
export async function verifyPassword({
  hash,
  password,
}: {
  hash: string;
  password: string;
}): Promise<boolean> {
  const match = PHC.exec(hash);
  if (!match) return false;
  const [, memory, passes, parallelism, salt, expected] = match.map(String);
  const params = [Number(memory), Number(passes), Number(parallelism)] as const;
  // A stored hash weaker than the policy is refused, so a tampered row cannot downgrade the cost.
  if (params[0] < MEMORY_KIB || params[1] < PASSES || params[2] < PARALLELISM) return false;
  // ...and one far stronger than the policy is refused too: a forged cost must not exhaust memory or CPU.
  if (params[0] > MEMORY_KIB * 4 || params[1] > PASSES * 5 || params[2] > PARALLELISM * 4)
    return false;
  const expectedKey = Buffer.from(expected ?? '', 'base64');
  if (expectedKey.length !== TAG_BYTES) return false;
  try {
    const key = await derive(password, Buffer.from(salt ?? '', 'base64'), ...params);
    return timingSafeEqual(key, expectedKey);
  } catch {
    // node:crypto rejects out-of-range parameters with an error: treated as a non-matching hash.
    return false;
  }
}
