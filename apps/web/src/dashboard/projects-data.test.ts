import { describe, expect, it } from 'vitest';
import { loadProjects } from './projects-data';

const row = {
  id: '3f8e1c52-6b1a-4a54-9d0e-2a7f7b0c9a11',
  title: 'Atelier Soleil',
  industryLabel: 'Boulangerie',
  language: 'fr',
  briefText: null,
  status: 'ready',
  createdAt: '2026-11-01T10:00:00.000Z',
  updatedAt: '2026-11-02T10:00:00.000Z',
};
const answer = (status: number, body: unknown) => () =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

describe('loadProjects', () => {
  it('returns the validated projects', async () => {
    const result = await loadProjects(answer(200, { items: [row], nextCursor: null }));
    expect(result).toEqual({ kind: 'ready', projects: [row] });
  });

  it('reports an empty account', async () => {
    expect(await loadProjects(answer(200, { items: [], nextCursor: null }))).toEqual({
      kind: 'empty',
    });
  });

  it('reports a signed-out visitor on 401', async () => {
    expect(await loadProjects(answer(401, {}))).toEqual({ kind: 'signed-out' });
  });

  it('tells an answer that does not match the contract (invalid), not a network failure', async () => {
    expect(await loadProjects(answer(200, { items: [{ id: 3 }], nextCursor: null }))).toEqual({
      kind: 'invalid',
    });
    expect(
      await loadProjects(() => Promise.resolve(new Response('<html>', { status: 200 }))),
    ).toEqual({
      kind: 'invalid',
    });
  });

  it('tells a network failure (no answer) from a server error (HTTP 5xx)', async () => {
    expect(await loadProjects(() => Promise.reject(new TypeError('offline')))).toEqual({
      kind: 'network',
    });
    expect(await loadProjects(answer(500, {}))).toEqual({ kind: 'server' });
    expect(await loadProjects(answer(503, {}))).toEqual({ kind: 'server' });
  });

  it('does not hide a programming error as a network failure', async () => {
    await expect(loadProjects(() => Promise.reject(new RangeError('bug')))).rejects.toThrow('bug');
  });
});
