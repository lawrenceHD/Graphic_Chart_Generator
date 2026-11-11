import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseRecording, serializeRecording, type ResearchRecording } from '@app/ai';

// Disk access of the research, kept here: the worker has the disk, @app/ai does not.

// src/ and dist/ sit at the same depth: three levels up is the repository root in both.
const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url));

/**
 * A relative path of the research configuration (corpus, recordings, replay file) is read from the repository
 * root: the worker starts in apps/worker, where `corpus-reel` does not exist.
 */
export const fromRepoRoot = (path: string): string =>
  isAbsolute(path) ? path : resolve(REPO_ROOT, path);

// Only a missing path means "absent"; EACCES, EIO and the like are relayed so they are not misdiagnosed.
const isMissing = (cause: unknown): boolean => Reflect.get(Object(cause), 'code') === 'ENOENT';

/** Content of every `index.jsonl` under `root` (the private corpus, outside Git); undefined when absent. */
export async function readCorpusIndex(root: string): Promise<string | undefined> {
  let entries: string[];
  try {
    entries = await readdir(root, { recursive: true });
  } catch (cause) {
    if (isMissing(cause)) return undefined;
    throw cause;
  }
  const files = entries.filter((entry) => /(^|[\\/])index\.jsonl$/u.test(entry)).sort();
  if (files.length === 0) return undefined;
  const texts = await Promise.all(files.map((file) => readFile(join(root, file), 'utf8')));
  return texts.map((text) => text.trimEnd()).join('\n');
}

export interface LoadedRecordings {
  readonly recordings: readonly ResearchRecording[];
  /** Files that did not parse: reported by the caller, never skipped silently. */
  readonly rejected: readonly string[];
}

/** The recordings (`*.json`) of a directory; a missing directory holds none. */
export async function loadRecordings(dir: string): Promise<LoadedRecordings> {
  let names: string[];
  try {
    names = (await readdir(dir)).filter((name) => name.endsWith('.json')).sort();
  } catch (cause) {
    if (isMissing(cause)) return { recordings: [], rejected: [] };
    throw cause;
  }
  const recordings: ResearchRecording[] = [];
  const rejected: string[] = [];
  for (const name of names) {
    try {
      const parsed = parseRecording(await readFile(join(dir, name), 'utf8'));
      if (parsed.ok) recordings.push(parsed.value);
      else rejected.push(name);
    } catch {
      rejected.push(name);
    }
  }
  return { recordings, rejected };
}

/** Writes one recording per logo (named by its fingerprint) to build the demo plan. */
export async function writeRecording(dir: string, recording: ResearchRecording): Promise<void> {
  await mkdir(dir, { recursive: true });
  const name = recording.key.replaceAll(/[^A-Za-z0-9_-]/gu, '_');
  await writeFile(join(dir, `${name}.json`), serializeRecording(recording), 'utf8');
}
