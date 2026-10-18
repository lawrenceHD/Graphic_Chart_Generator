import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password.js';

describe('Argon2id password hashing (SEC-01, T-013)', () => {
  it('produces a PHC string with the OWASP parameters and a random salt', async () => {
    const first = await hashPassword('correct horse battery staple');
    const second = await hashPassword('correct horse battery staple');

    expect(first).toMatch(
      /^\$argon2id\$v=19\$m=19456,t=2,p=1\$[A-Za-z0-9+/]{22}\$[A-Za-z0-9+/]{43}$/,
    );
    expect(second).not.toBe(first);
  });

  it('verifies the right password only', async () => {
    const hash = await hashPassword('correct horse battery staple');

    await expect(verifyPassword({ hash, password: 'correct horse battery staple' })).resolves.toBe(
      true,
    );
    await expect(verifyPassword({ hash, password: 'correct horse battery stapl' })).resolves.toBe(
      false,
    );
  });

  it('rejects tampered, malformed or weakened hashes without throwing', async () => {
    const hash = await hashPassword('secret-password');
    const tampered = `${hash.slice(0, -2)}${hash.endsWith('AA') ? 'AB' : 'AA'}`;
    const weakened = hash.replace('m=19456,t=2', 'm=8,t=1');
    const exhausting = hash.replace('m=19456', 'm=4194304');

    for (const candidate of [
      tampered,
      weakened,
      exhausting,
      'plain',
      '$argon2i$v=19$m=19456,t=2,p=1$x$y',
      '',
    ]) {
      await expect(verifyPassword({ hash: candidate, password: 'secret-password' })).resolves.toBe(
        false,
      );
    }
  });
});
