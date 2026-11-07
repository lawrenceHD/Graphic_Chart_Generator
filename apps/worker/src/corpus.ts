import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseRecording, serializeRecording, type ResearchRecording } from '@app/ai';

// Disk access of the research, kept here: the worker has the disk, @app/ai does not.

/** Content of every `index.jsonl` under `root` (the private corpus, outside Git); undefined when absent. */
export async function readCorpusIndex(root: string): Promise<string | undefined> {
  let entries: string[];
  try {
    entries = await readdir(root, { recursive: true });
  } catch {
    return undefined;
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
  } catch {
    return { recordings: [], rejected: [] };
  }
  const recordings: ResearchRecording[] = [];
  const rejected: string[] = [];
  for (const name of names) {
    const parsed = parseRecording(await readFile(join(dir, name), 'utf8'));
    if (parsed.ok) recordings.push(parsed.value);
    else rejected.push(name);
  }
  return { recordings, rejected };
}

/** Writes one recording per logo (named by its fingerprint) to build the demo plan. */
export async function writeRecording(dir: string, recording: ResearchRecording): Promise<void> {
  await mkdir(dir, { recursive: true });
  const name = recording.key.replaceAll(/[^A-Za-z0-9_-]/gu, '_');
  await writeFile(join(dir, `${name}.json`), serializeRecording(recording), 'utf8');
}
