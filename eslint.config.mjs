import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/.turbo/**',
      'backend/**',
      'frontend/**',
      'inspi front/**',
      'docs/**',
      'coverage/**',
    ],
  },
  ...tseslint.configs.recommendedTypeChecked,
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
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
      ],
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/ban-ts-comment': 'error',
    },
  },
  {
    files: ['**/*.config.{ts,js,mjs,cjs}', '**/.*.cjs'],
    extends: [tseslint.configs.disableTypeChecked],
  },
  {
    files: [
      'packages/color-engine/**/*.{ts,tsx}',
      'packages/document/**/*.{ts,tsx}',
      'packages/logo-kit/**/*.{ts,tsx}',
    ],
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'Date', message: 'Date is forbidden in pure packages. Inject time if needed.' },
        { name: 'fetch', message: 'fetch is forbidden in pure packages. Pure functions only.' },
      ],
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: 'Math.random is forbidden in pure packages.' },
        { object: 'process', message: 'process is forbidden in pure packages.' },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['node:*', 'fs', 'path', 'os', 'child_process', 'crypto', 'http', 'https'],
              message: 'Node.js built-in modules are forbidden in pure packages.',
            },
          ],
        },
      ],
    },
  },
);
