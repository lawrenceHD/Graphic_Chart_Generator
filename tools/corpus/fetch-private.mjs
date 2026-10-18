// Clones or updates the owner's private corpus (real logos, brand charters, the logo library) into a local,
// git-ignored cache. Its files belong to their authors: they never enter this public repository, its fixtures,
// the application or its marketing (see corpus-reel/README.md). Needs SSH access to the private repository.
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const REPOSITORY = 'git@github.com:lawrenceHD/Graph_Charta.git';

const root = path.resolve(import.meta.dirname, '..', '..');
const target = path.join(root, '.cache', 'corpus-private');

function git(args, cwd) {
  const result = spawnSync('git', args, { cwd, stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error(
      `git ${args[0]} failed (exit ${String(result.status)}): SSH access to ${REPOSITORY}?`,
    );
  }
}

if (existsSync(path.join(target, '.git'))) {
  git(['pull', '--quiet', '--ff-only'], target);
} else {
  git(['clone', '--quiet', REPOSITORY, target], root);
}
console.log(`Corpus privé disponible dans ${target}.`);
