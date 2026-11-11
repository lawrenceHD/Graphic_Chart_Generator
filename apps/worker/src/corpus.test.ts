import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { isAbsolute, join, resolve } from 'node:path';
import { loadFontCatalogue, runResearch } from '@app/ai';
import { afterEach, describe, expect, it } from 'vitest';
import { fromRepoRoot, loadRecordings, readCorpusIndex, writeRecording } from './corpus.js';
import { indexText, okTransport } from './research-fixtures.js';

const dirs: string[] = [];
const temp = async (): Promise<string> => {
  const dir = await mkdtemp(join(tmpdir(), 'charta-corpus-'));
  dirs.push(dir);
  return dir;
};
afterEach(async () => {
  for (const dir of dirs.splice(0)) await rm(dir, { recursive: true, force: true });
});

describe('corpus index', () => {
  it('is undefined when the corpus directory or its indexes are absent', async () => {
    const root = await temp();
    expect(await readCorpusIndex(join(root, 'missing'))).toBeUndefined();
    expect(await readCorpusIndex(root)).toBeUndefined();
  });

  it('relays a read failure other than a missing directory instead of calling it absent', async () => {
    const root = await temp();
    const file = join(root, 'not-a-dir');
    await writeFile(file, 'x');
    await expect(readCorpusIndex(file)).rejects.toMatchObject({ code: 'ENOTDIR' });
  });

  it('concatenates every index.jsonl found under the root', async () => {
    const root = await temp();
    await mkdir(join(root, 'a'));
    await mkdir(join(root, 'b'));
    await writeFile(join(root, 'a', 'index.jsonl'), '{"n":1}\n');
    await writeFile(join(root, 'b', 'index.jsonl'), '{"n":2}\n');
    await writeFile(join(root, 'b', 'other.txt'), 'ignored');
    expect(await readCorpusIndex(root)).toBe('{"n":1}\n{"n":2}');
  });
});

describe('recordings on disk', () => {
  it('writes the recording of a live research and loads it back', async () => {
    const dir = await temp();
    const outcome = await runResearch(
      {
        transport: okTransport().transport,
        visionModel: 'gemini-test',
        catalogue: loadFontCatalogue(),
        readIndex: () => Promise.resolve(indexText),
        now: () => '2026-11-07T10:00:00.000Z',
      },
      { logo: { data: new Uint8Array([1, 2]), mimeType: 'image/png' }, palette: ['#7A1F2B'] },
    );
    const recording = outcome.ok ? outcome.value.recording : undefined;
    if (recording === undefined) throw new Error('no recording');
    await writeRecording(join(dir, 'rec'), recording);
    expect(await readdir(join(dir, 'rec'))).toHaveLength(1);
    const loaded = await loadRecordings(join(dir, 'rec'));
    expect(loaded.rejected).toEqual([]);
    expect(loaded.recordings.map((entry) => entry.key)).toEqual([recording.key]);
  });

  it('reports an unreadable recording file by name instead of crashing the worker', async () => {
    const dir = await temp();
    await mkdir(join(dir, 'unreadable.json'));
    expect(await loadRecordings(dir)).toEqual({ recordings: [], rejected: ['unreadable.json'] });
  });

  it('relays a directory read failure other than a missing directory', async () => {
    const dir = await temp();
    const file = join(dir, 'file');
    await writeFile(file, 'x');
    await expect(loadRecordings(file)).rejects.toMatchObject({ code: 'ENOTDIR' });
  });

  it('reports a file that is not a recording instead of skipping it silently', async () => {
    const dir = await temp();
    await writeFile(join(dir, 'bad.json'), '{"nope":true}');
    expect(await loadRecordings(dir)).toEqual({ recordings: [], rejected: ['bad.json'] });
    expect((await loadRecordings(join(dir, 'missing'))).recordings).toEqual([]);
  });
});

describe('fromRepoRoot', () => {
  it('reads a relative path from the repository root, wherever the worker was started', () => {
    const corpus = fromRepoRoot('corpus-reel');
    expect(isAbsolute(corpus)).toBe(true);
    expect(existsSync(join(fromRepoRoot('.'), 'pnpm-workspace.yaml'))).toBe(true);
    expect(corpus).toBe(join(fromRepoRoot('.'), 'corpus-reel'));
    expect(corpus).not.toBe(resolve('corpus-reel'));
  });

  it('leaves an absolute path as it is', () => {
    const absolute = resolve('somewhere', 'else');
    expect(fromRepoRoot(absolute)).toBe(absolute);
  });
});
