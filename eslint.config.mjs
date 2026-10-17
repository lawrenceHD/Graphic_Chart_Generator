import tseslint from 'typescript-eslint';

const NODE_BUILTINS = [
  'node:*',
  'fs',
  'fs/*',
  'path',
  'os',
  'child_process',
  'crypto',
  'http',
  'https',
  'net',
  'stream',
  'url',
  'worker_threads',
  'zlib',
];

const forbidNodeBuiltins = (reason) => [
  'error',
  {
    patterns: [
      { group: NODE_BUILTINS, message: `Node.js built-in modules are forbidden: ${reason}` },
    ],
  },
];

// Pure packages (ADR-016): no clock, randomness, network, process or disk unless injected.
const PURE_GLOBALS = [
  { name: 'Date', message: 'Date is forbidden in pure packages. Inject time if needed.' },
  { name: 'fetch', message: 'fetch is forbidden in pure packages. Pure functions only.' },
  { name: 'process', message: 'process is forbidden in pure packages.' },
  {
    name: 'performance',
    message: 'performance is forbidden in pure packages. Inject time if needed.',
  },
  { name: 'crypto', message: 'crypto is forbidden in pure packages. Inject randomness if needed.' },
  { name: 'globalThis', message: 'globalThis would bypass the purity rules of this package.' },
];

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/.turbo/**', 'docs/**', 'coverage/**'],
  },
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['*.config.ts', '*.config.mjs', '.*.cjs'],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      'no-console': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
      ],
      // `as const` stays allowed; every other assertion must become a Zod parse or a type guard.
      '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }],
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/ban-ts-comment': 'error',
    },
  },
  {
    files: ['**/*.config.{ts,js,mjs,cjs}', '**/.*.cjs', 'tools/**/*.mjs'],
    extends: [tseslint.configs.disableTypeChecked],
    rules: { 'no-console': 'off' },
  },
  {
    files: [
      'packages/kernel/**/*.{ts,tsx}',
      'packages/color-engine/**/*.{ts,tsx}',
      'packages/document/**/*.{ts,tsx}',
      'packages/logo-kit/**/*.{ts,tsx}',
      'packages/svg-engine/**/*.{ts,tsx}',
    ],
    // T-008 isolates SVG rasterisation in a child process: only src/raster may touch Node.
    ignores: ['packages/svg-engine/src/raster/**'],
    rules: {
      'no-restricted-globals': ['error', ...PURE_GLOBALS],
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message: 'Math.random is forbidden in pure packages.',
        },
      ],
      'no-restricted-imports': forbidNodeBuiltins('pure package (ADR-016).'),
    },
  },
  {
    files: ['packages/mockup-engine/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'process', message: 'mockup-engine runs in the browser only (ADR-016).' },
      ],
      'no-restricted-imports': forbidNodeBuiltins(
        'mockup-engine runs in the browser only (ADR-016).',
      ),
    },
  },
);
