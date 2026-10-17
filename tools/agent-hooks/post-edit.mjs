// PostToolUse hook: formats the edited file and type-checks its package, so the agent
// sees type errors right after the edit instead of at `pnpm verify` time.
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const FORMATTABLE = /\.(c|m)?[jt]sx?$|\.json$|\.css$/;
const TYPED = /\.tsx?$/;
const MAX_REPORT_CHARS = 4000;

function run(args, cwd) {
  return spawnSync(process.execPath, args, { cwd, encoding: 'utf8', timeout: 90_000 });
}

function packageDirOf(absFile, root) {
  let dir = path.dirname(absFile);
  while (dir.startsWith(root) && dir !== root) {
    if (existsSync(path.join(dir, 'package.json')) && existsSync(path.join(dir, 'tsconfig.json'))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return null;
}

let event;
try {
  event = JSON.parse(readFileSync(0, 'utf8'));
} catch {
  process.exit(0);
}

const root = path.resolve(process.env.CLAUDE_PROJECT_DIR ?? event.cwd ?? process.cwd());
const filePath = event.tool_input?.file_path;
if (typeof filePath !== 'string') process.exit(0);

const absFile = path.resolve(root, filePath);
const rel = path.relative(root, absFile).split(path.sep).join('/');
if (!/^(apps|packages)\//.test(rel) || !existsSync(absFile)) process.exit(0);

if (FORMATTABLE.test(rel)) {
  const prettier = path.join(root, 'node_modules', 'prettier', 'bin', 'prettier.cjs');
  if (existsSync(prettier)) run([prettier, '--write', '--log-level', 'warn', absFile], root);
}

if (TYPED.test(rel)) {
  const tsc = path.join(root, 'node_modules', 'typescript', 'bin', 'tsc');
  const pkgDir = packageDirOf(absFile, root);
  if (pkgDir && existsSync(tsc)) {
    const result = run([tsc, '--noEmit', '-p', 'tsconfig.json'], pkgDir);
    if (result.status !== 0) {
      const output =
        `${result.stdout ?? ''}${result.stderr ?? ''}`.trim() ||
        'tsc a échoué sans sortie (délai dépassé ?)';
      process.stderr.write(
        `Typecheck en échec dans ${path.relative(root, pkgDir)} après modification de ${rel} :\n` +
          output.slice(0, MAX_REPORT_CHARS),
      );
      process.exit(2);
    }
  }
}
process.exit(0);
