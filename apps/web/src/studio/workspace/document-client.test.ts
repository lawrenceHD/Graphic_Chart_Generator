import { CURRENT_SCHEMA_VERSION } from '@app/document';
import { describe, expect, it } from 'vitest';
import { demoFor } from '../../landing/demo';
import { loadProject } from './document-client';

const { document } = demoFor('la-meza');
const project = {
  id: '01a1cd76-e70f-712a-aa0b-c25e8e0b61f9',
  title: 'La Mèza',
  industryLabel: null,
  language: 'fr',
  briefText: null,
  status: 'ready',
};
const answer = (body: unknown) => () =>
  Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));

describe('loadProject (a guideline saved by an earlier version still opens)', () => {
  it('opens a document of schema 1 through the migration, as the current version', async () => {
    const stored = { ...document, schemaVersion: 1 };
    const loaded = await loadProject(
      answer({ project, document: { seq: 4, body: stored } }),
      project.id,
    );
    if (!loaded.ok) throw new Error(`refused: ${JSON.stringify(loaded.error)}`);
    expect(loaded.value.revision?.seq).toBe(4);
    expect(loaded.value.revision?.document.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it('still refuses a body that is not a guideline', async () => {
    const loaded = await loadProject(
      answer({ project, document: { seq: 1, body: { schemaVersion: 1, pages: 'nope' } } }),
      project.id,
    );
    expect(loaded).toEqual({ ok: false, error: { kind: 'invalid' } });
  });
});
