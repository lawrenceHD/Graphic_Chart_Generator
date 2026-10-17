// PreToolUse hook: turns the non-negotiable rules of AGENTS.md into automatic decisions
// before the agent writes a file or runs a shell command.
import { readFileSync } from 'node:fs';
import path from 'node:path';

const CODE_FILE = /\.(c|m)?[jt]sx?$/;
const PURE_PACKAGES = /^packages\/(color-engine|document|logo-kit|svg-engine)\/src\//;
// T-008 isolates SVG rasterisation in a child process, so svg-engine/src/raster is not pure.
const PURE_EXCEPTIONS = /^packages\/svg-engine\/src\/raster\//;

const DENIED_PATHS = [
  {
    test: /^docs\/golden\//,
    why: 'les vecteurs de référence ne se modifient jamais (AGENTS.md §4, §8)',
  },
  { test: /^pnpm-lock\.yaml$/, why: 'le lockfile ne se modifie que par pnpm' },
];
const ASK_PATHS = [
  { test: /^AGENTS\.md$/, why: 'AGENTS.md ne se modifie pas sans accord explicite (AGENTS.md §8)' },
  { test: /^docs\//, why: 'docs/ ne se modifie pas sans accord explicite (AGENTS.md §8)' },
  { test: /^\.mcp\.json$/, why: 'configuration MCP : revue mcp-dependency-review requise' },
  { test: /^\.github\//, why: 'modification de la CI' },
];

const CODE_RULES = [
  {
    re: /\bconsole\s*\.\s*(log|debug|info|warn|error|trace)\s*\(/,
    why: 'pas de console.* : utiliser le logger pino (AGENTS.md §4)',
  },
  {
    re: /@ts-(ignore|nocheck|expect-error)\b/,
    why: 'pas de @ts-ignore / @ts-nocheck / @ts-expect-error (AGENTS.md §4)',
  },
  { re: /eslint-disable/, why: 'ne jamais désactiver une règle de lint (AGENTS.md §6)' },
  {
    re: /\bas\s+any\b|:\s*any\b|<any>/,
    why: 'zéro any : utiliser unknown puis Zod (AGENTS.md §4)',
  },
  {
    re: /\bas\s+unknown\s+as\b/,
    why: 'double assertion « as unknown as » interdite (AGENTS.md §4)',
  },
];
const ASK_CODE_RULES = [
  {
    re: /dangerouslySetInnerHTML/,
    why: 'dangerouslySetInnerHTML : jamais avec du contenu utilisateur (AGENTS.md §4)',
  },
];
const PURE_RULES = [
  {
    re: /\bMath\s*\.\s*random\b/,
    why: 'Math.random interdit dans un package pur : injecter la source d’aléa',
  },
  {
    re: /\bDate\s*\.\s*now\b|\bnew\s+Date\b/,
    why: 'horloge interdite dans un package pur : injecter le temps',
  },
  {
    re: /\bprocess\s*[.[]|globalThis\s*\.\s*process\b/,
    why: 'process interdit dans un package pur',
  },
  { re: /\bfetch\s*\(/, why: 'réseau interdit dans un package pur' },
  { re: /\bperformance\s*\.\s*now\b/, why: 'horloge interdite dans un package pur' },
  {
    re: /\bcrypto\s*\.\s*(randomUUID|getRandomValues)\b/,
    why: 'aléa interdit dans un package pur : injecter la source',
  },
  {
    re: /from\s+['"](node:[^'"]*|fs|fs\/promises|path|os|child_process|crypto|http|https|net)['"]|\brequire\s*\(/,
    why: 'modules Node interdits dans un package pur',
  },
];

const BASH_DENY = [
  {
    re: /--no-verify\b|--no-gpg-sign\b/,
    why: 'ne jamais contourner les hooks git ni la signature',
  },
  {
    re: /\bgit\s+push\b[^|;&]*\s(--force\b|--force-with-lease\b|-f\b)/,
    why: 'push forcé interdit',
  },
  {
    re: /(>{1,2}|\btee\b[^|;&]*|\bsed\s+-i\b[^|;&]*)\s*["']?[^\s|;&]*(docs\/golden\/|pnpm-lock\.yaml)/,
    why: 'écriture shell vers un fichier protégé',
  },
];
const BASH_ASK = [
  {
    re: /\b(pnpm|npm|yarn|bun)\s+(add|install|i)\b(\s+-{1,2}[\w=-]+)*\s+(?!-)[@\w]/,
    why: 'ajout de dépendance : autorisation écrite du ticket requise (AGENTS.md §4)',
  },
];

function decide(decision, reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: decision,
        permissionDecisionReason: reason,
      },
    }),
  );
  process.exit(0);
}

function relativePath(filePath, root) {
  return path.relative(root, path.resolve(root, filePath)).split(path.sep).join('/');
}

function writtenText(tool, input) {
  if (tool === 'Write') return input.content ?? '';
  if (tool === 'Edit') return input.new_string ?? '';
  if (tool === 'MultiEdit') return (input.edits ?? []).map((e) => e.new_string ?? '').join('\n');
  return '';
}

function firstMatch(rules, text) {
  return rules.find((rule) => rule.re.test(text));
}

function checkFile(tool, input, root) {
  if (typeof input.file_path !== 'string') return;
  const rel = relativePath(input.file_path, root);
  const denied = DENIED_PATHS.find((p) => p.test.test(rel));
  if (denied) decide('deny', `${rel} : ${denied.why}.`);

  const text = writtenText(tool, input);
  const isProjectCode = CODE_FILE.test(rel) && /^(apps|packages)\//.test(rel);
  if (isProjectCode) {
    const broken = firstMatch(CODE_RULES, text);
    if (broken) decide('deny', `${rel} : ${broken.why}.`);
    if (PURE_PACKAGES.test(rel) && !PURE_EXCEPTIONS.test(rel)) {
      const impure = firstMatch(PURE_RULES, text);
      if (impure) decide('deny', `${rel} : ${impure.why} (AGENTS.md §4).`);
    }
    const risky = firstMatch(ASK_CODE_RULES, text);
    if (risky) decide('ask', `${rel} : ${risky.why}.`);
  }

  const asked = ASK_PATHS.find((p) => p.test.test(rel));
  if (asked) decide('ask', `${rel} : ${asked.why}.`);
}

function checkCommand(command) {
  const denied = firstMatch(BASH_DENY, command);
  if (denied) decide('deny', `Commande refusée : ${denied.why}.`);
  const asked = firstMatch(BASH_ASK, command);
  if (asked) decide('ask', `Commande à confirmer : ${asked.why}.`);
}

let event;
try {
  event = JSON.parse(readFileSync(0, 'utf8'));
} catch {
  // Unparseable hook input: let Claude Code's normal permission flow decide.
  process.exit(0);
}

const root = process.env.CLAUDE_PROJECT_DIR ?? event.cwd ?? process.cwd();
const tool = event.tool_name;
const input = event.tool_input ?? {};

if (tool === 'Write' || tool === 'Edit' || tool === 'MultiEdit') checkFile(tool, input, root);
if ((tool === 'Bash' || tool === 'PowerShell') && typeof input.command === 'string')
  checkCommand(input.command);
process.exit(0);
