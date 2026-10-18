import { describe, expect, it } from 'vitest';
import { createHealthResponse } from './health-response';

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

  it('reports the failure cause to the caller without exposing it in the response', async () => {
    const causes: unknown[] = [];
    const failure = new Error('database-internal-sentinel');
    const response = await createHealthResponse(
      () => Promise.reject(failure),
      (cause) => causes.push(cause),
    );

    expect(causes).toEqual([failure]);
    expect(await response.text()).not.toContain('sentinel');
  });
});
