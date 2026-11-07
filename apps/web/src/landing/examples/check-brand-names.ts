// Guard: Charta is a generic product, so no demonstration brand may be named in product code. Scans apps/ and
// packages/ and reports every hit outside tests, fixtures and landing/examples/data. Run by the unit tests (so by
// `pnpm verify`) and by hand: `node apps/web/src/landing/examples/check-brand-names.ts`.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const FORBIDDEN = /m[eè]za/iu;
const ROOTS = ['apps', 'packages'];
const SKIPPED_DIRECTORIES = new Set([
  'node_modules',
  '.next',
  'dist',
  'coverage',
  '.turbo',
  'build',
]);
const TEXT_EXTENSIONS = /\.(?:[cm]?[jt]sx?|json|md|css|html|svg|txt|ya?ml)$/u;
const ALLOWED = [
  /\.(?:test|spec)\.[^/]+$/u,
  /(?:^|\/)fixtures?\//u,
  /(?:^|\/)landing\/examples\/data\//u,
];

function* files(directory: string): Generator<string> {
  for (const name of readdirSync(directory)) {
    if (SKIPPED_DIRECTORIES.has(name)) continue;
    const path = join(directory, name);
    if (statSync(path).isDirectory()) yield* files(path);
    else if (TEXT_EXTENSIONS.test(name)) yield path;
  }
}

export interface BrandLeak {
  readonly file: string;
  readonly line: number;
  readonly text: string;
}

export function findBrandLeaks(repositoryRoot: string): BrandLeak[] {
  const leaks: BrandLeak[] = [];
  for (const rootName of ROOTS) {
    const root = join(repositoryRoot, rootName);
    try {
      statSync(root);
    } catch {
      continue;
    }
    for (const path of files(root)) {
      const file = relative(repositoryRoot, path).split(sep).join('/');
      if (ALLOWED.some((pattern) => pattern.test(file))) continue;
      readFileSync(path, 'utf8')
        .split('\n')
        .forEach((text, index) => {
          if (FORBIDDEN.test(text))
            leaks.push({ file, line: index + 1, text: text.trim().slice(0, 120) });
        });
    }
  }
  return leaks.sort((a, b) => (a.file === b.file ? a.line - b.line : a.file < b.file ? -1 : 1));
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const repository = resolve(fileURLToPath(import.meta.url), '../../../../../..');
  const leaks = findBrandLeaks(repository);
  for (const leak of leaks)
    process.stderr.write(`${leak.file}:${String(leak.line)}  ${leak.text}\n`);
  if (leaks.length > 0) {
    process.stderr.write(
      `${String(leaks.length)} hard-coded demo brand name(s): move them to landing/examples/data.\n`,
    );
    process.exit(1);
  }
  process.stdout.write('No demo brand name outside tests, fixtures and landing/examples/data.\n');
}
