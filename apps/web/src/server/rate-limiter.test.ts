import { createTestDatabase, integrationDatabaseUrl, type TestDatabase } from '@app/db/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { clientIp } from './http';
import { createRateLimiter } from './rate-limiter';

const adminUrl = integrationDatabaseUrl();

describe.runIf(adminUrl !== '')('rate limiter (04_API_CONTRACTS.md §7, SEC-24)', () => {
  let test: TestDatabase;
  let clock = new Date('2026-10-18T10:00:00Z');
  const limiter = () => createRateLimiter(test.database.orm, () => clock);
  const perMinute = { max: 2, windowMs: 60_000 };

  beforeAll(async () => {
    test = await createTestDatabase(adminUrl);
  });
  afterAll(async () => {
    await test.dispose();
  });

  it('allows up to the limit in a fixed window, then answers the seconds left', async () => {
    const hit = () => limiter().hit([{ key: 'upload:alice', limit: perMinute }]);
    expect(await hit()).toBe(0);
    expect(await hit()).toBe(0);
    clock = new Date(clock.getTime() + 15_000);
    expect(await hit()).toBe(45);
    clock = new Date(clock.getTime() + 45_000);
    expect(await hit()).toBe(0);
  });

  it('refuses when any key is over its limit, and counts every key', async () => {
    const both = () =>
      limiter().hit([
        { key: 'upload:bob', limit: perMinute },
        { key: 'upload-ip:198.51.100.7', limit: { max: 3, windowMs: 60_000 } },
      ]);
    expect(await both()).toBe(0);
    expect(await both()).toBe(0);
    expect(await both()).toBeGreaterThan(0);
    expect(await limiter().hit([{ key: 'upload:carol', limit: perMinute }])).toBe(0);
    expect(
      await limiter().hit([{ key: 'upload-ip:198.51.100.7', limit: { max: 3, windowMs: 60_000 } }]),
    ).toBeGreaterThan(0);
  });

  it('stores a hash, never the raw identity or IP', async () => {
    await limiter().hit([{ key: 'guest-ip:203.0.113.9', limit: perMinute }]);
    const keys = (await test.database.pool.query<{ key: string }>('SELECT key FROM rate_limit'))
      .rows;
    expect(keys.length).toBeGreaterThan(0);
    for (const { key } of keys) expect(key).toMatch(/^api:[0-9a-f]{64}$/);
  });
});

describe('client IP behind TRUSTED_PROXY_HOPS proxies', () => {
  const request = (value?: string) =>
    new Request('http://x', value === undefined ? {} : { headers: { 'x-forwarded-for': value } });

  it('ignores X-Forwarded-For with no trusted proxy (the client writes it)', () => {
    expect(clientIp(request('198.51.100.1'))).toBeNull();
    expect(clientIp(request('198.51.100.1'), 0)).toBeNull();
  });

  it('counts N entries from the right, where the proxies append the real address', () => {
    expect(clientIp(request(' 6.6.6.6 , 203.0.113.9 '), 1)).toBe('203.0.113.9');
    expect(clientIp(request('6.6.6.6, 203.0.113.9, 10.0.0.1'), 2)).toBe('203.0.113.9');
    expect(clientIp(request('203.0.113.9'), 1)).toBe('203.0.113.9');
  });

  it('is null when the chain is shorter than the hops or the header is empty', () => {
    expect(clientIp(request('203.0.113.9'), 2)).toBeNull();
    expect(clientIp(request(), 1)).toBeNull();
    expect(clientIp(request(''), 1)).toBeNull();
  });
});
