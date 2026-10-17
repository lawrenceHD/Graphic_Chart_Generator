import { describe, expect, it } from 'vitest';
import { createHealthResponse } from './health-response.js';

describe('createHealthResponse', () => {
  it('returns ok after the database query succeeds', async () => {
    const response = await createHealthResponse(() => Promise.resolve(undefined));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: 'ok' });
  });

  it('returns degraded without exposing database errors', async () => {
    const response = await createHealthResponse(() =>
      Promise.reject(new Error('database-internal-sentinel')),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ status: 'degraded' });
  });
});
