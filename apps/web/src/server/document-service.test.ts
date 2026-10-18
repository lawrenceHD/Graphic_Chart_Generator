import { randomBytes } from 'node:crypto';
import { documents, eq, guestSessions, projects, revisions } from '@app/db';
import { createTestDatabase, integrationDatabaseUrl, type TestDatabase } from '@app/db/testing';
import { makeDocument } from '@app/document/testing';
import { uuidV7 } from '@app/kernel';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { applyCommand, redo, undo, undoRevision } from './document-service.js';

const adminUrl = integrationDatabaseUrl();
const id = (): string => uuidV7(Date.now(), randomBytes(10));
const colour = (hex: string) => ({ type: 'SetColorToken', token: 'primary', hex });

describe.runIf(adminUrl !== '')('document service (T-016, ADR-018)', () => {
  let test: TestDatabase;
  beforeAll(async () => {
    test = await createTestDatabase(adminUrl);
  });
  afterAll(async () => {
    await test.dispose();
  });

  async function newProject(): Promise<string> {
    const { orm } = test.database;
    const guestSessionId = id();
    await orm
      .insert(guestSessions)
      .values({ id: guestSessionId, tokenHash: guestSessionId, expiresAt: new Date() });
    const projectId = id();
    await orm.insert(projects).values({ id: projectId, title: 'Brand', guestSessionId });
    await orm
      .insert(documents)
      .values({ projectId, schemaVersion: 1, body: makeDocument(), seq: 0 });
    return projectId;
  }
  const primary = async (projectId: string, seq: number, hex: string) => {
    const result = await applyCommand(test.database.orm, {
      projectId,
      baseSeq: seq,
      command: colour(hex),
      actor: 'user',
    });
    if (!result.ok) throw new Error(result.error.code);
    return result.value;
  };

  it('applies a command, stores the revision and its inverse with expect', async () => {
    const projectId = await newProject();
    const result = await primary(projectId, 0, '#111111');
    const stored = await test.database.orm
      .select()
      .from(revisions)
      .where(eq(revisions.projectId, projectId));

    expect(result.seq).toBe(1);
    expect(result.document.tokens.colors.primary.hex).toBe('#111111');
    expect(stored).toHaveLength(1);
    expect(stored[0]?.inverse).toMatchObject({
      type: 'SetColorToken',
      hex: '#1F4BFF',
      expect: '#111111',
    });
  });

  it('refuses a stale baseSeq (REVISION_CONFLICT) and an invalid command, writing nothing', async () => {
    const projectId = await newProject();
    await primary(projectId, 0, '#111111');
    const { orm } = test.database;

    expect(
      await applyCommand(orm, { projectId, baseSeq: 0, command: colour('#222222'), actor: 'user' }),
    ).toEqual({
      ok: false,
      error: { code: 'REVISION_CONFLICT', currentSeq: 1 },
    });
    expect(
      await applyCommand(orm, { projectId, baseSeq: 1, command: colour('#12'), actor: 'user' }),
    ).toEqual({
      ok: false,
      error: { code: 'INVALID_COMMAND' },
    });
    expect(
      await orm.select().from(revisions).where(eq(revisions.projectId, projectId)),
    ).toHaveLength(1);
  });

  it('serialises concurrent commands on the same base: exactly one wins', async () => {
    const projectId = await newProject();
    const { orm } = test.database;
    const results = await Promise.all(
      Array.from({ length: 8 }, (_, index) => `#00000${String(index)}`).map((hex) =>
        applyCommand(orm, { projectId, baseSeq: 0, command: colour(hex), actor: 'user' }),
      ),
    );
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(
      results.filter((result) => !result.ok && result.error.code === 'REVISION_CONFLICT'),
    ).toHaveLength(7);
  });

  it('undoes two revisions in turn, redoes them, and a new edit clears redo', async () => {
    const projectId = await newProject();
    const { orm } = test.database;
    await primary(projectId, 0, '#111111');
    await primary(projectId, 1, '#222222');

    const first = await undo(orm, { projectId, baseSeq: 2, actor: 'user' });
    const second = await undo(orm, { projectId, baseSeq: 3, actor: 'user' });
    expect(first.ok && first.value.document.tokens.colors.primary.hex).toBe('#111111');
    expect(second.ok && second.value.document.tokens.colors.primary.hex).toBe('#1F4BFF');
    expect(await undo(orm, { projectId, baseSeq: 4, actor: 'user' })).toEqual({
      ok: false,
      error: { code: 'NOTHING_TO_UNDO' },
    });

    const again = await redo(orm, { projectId, baseSeq: 4, actor: 'user' });
    expect(again.ok && again.value.document.tokens.colors.primary.hex).toBe('#111111');
    await primary(projectId, 5, '#333333');
    expect(await redo(orm, { projectId, baseSeq: 6, actor: 'user' })).toEqual({
      ok: false,
      error: { code: 'NOTHING_TO_REDO' },
    });
  });

  it('undoes an older revision unless its value changed since (UNDO_CONFLICT)', async () => {
    const projectId = await newProject();
    const { orm } = test.database;
    await primary(projectId, 0, '#111111');
    const accent = await applyCommand(orm, {
      projectId,
      baseSeq: 1,
      command: { type: 'SetColorToken', token: 'accent', hex: '#444444' },
      actor: 'ai',
    });
    if (!accent.ok) throw new Error(accent.error.code);
    await primary(projectId, 2, '#222222');

    expect(await undoRevision(orm, { projectId, baseSeq: 3, seq: 1, actor: 'user' })).toEqual({
      ok: false,
      error: { code: 'UNDO_CONFLICT' },
    });
    const undone = await undoRevision(orm, { projectId, baseSeq: 3, seq: 2, actor: 'user' });
    expect(undone.ok && undone.value.document.tokens.colors.accent.hex).toBe(
      makeDocument().tokens.colors.accent.hex,
    );
  });

  it('records a snapshot every 25 revisions', async () => {
    const projectId = await newProject();
    for (let seq = 0; seq < 25; seq += 1)
      await primary(projectId, seq, `#${String(seq).padStart(6, '0')}`);
    const stored = await test.database.orm
      .select()
      .from(revisions)
      .where(eq(revisions.projectId, projectId));
    expect(
      stored.filter((revision) => revision.snapshot !== null).map((revision) => revision.seq),
    ).toEqual([25]);
  });
});
