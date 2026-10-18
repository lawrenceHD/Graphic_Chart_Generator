// Downloads the logo-design-skill reference library (1,432 real-world SVG logos, classified) into a local,
// git-ignored cache. The logos are trademarks of their owners and are NOT covered by the MIT licence of
// that repository: they are never committed, redistributed, used as fixtures or shipped (see README.md).
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const REPOSITORY = 'https://github.com/kaankiziltug/logo-design-skill.git';
// Pinned and reviewed on 2026-10-18: a moved branch cannot change what is downloaded.
const COMMIT = '0ecf52e9a4b3ac92b714f7cc6e3148ab8c774134';
const LIBRARY_PATH = 'skills/logo-design/assets/library';

const root = path.resolve(import.meta.dirname, '..', '..');
const target = path.join(root, '.cache', 'logo-library');

function git(args, cwd) {
  const result = spawnSync('git', args, { cwd, stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error(`git ${args[0]} failed (exit ${String(result.status)})`);
  }
}

if (
  existsSync(path.join(target, LIBRARY_PATH, 'catalog.json')) &&
  !process.argv.includes('--force')
) {
  console.log(`Déjà présente : ${path.join(target, LIBRARY_PATH)} (--force pour retélécharger).`);
  process.exit(0);
}

rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });
git(['init', '--quiet'], target);
git(['remote', 'add', 'origin', REPOSITORY], target);
git(['sparse-checkout', 'set', '--no-cone', LIBRARY_PATH], target);
git(['fetch', '--quiet', '--depth', '1', '--filter=blob:none', 'origin', COMMIT], target);
git(['checkout', '--quiet', 'FETCH_HEAD'], target);
console.log(`Bibliothèque disponible dans ${path.join(target, LIBRARY_PATH)} (commit ${COMMIT}).`);
