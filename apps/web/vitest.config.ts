import { defineConfig } from 'vitest/config';

export default defineConfig({
  // tsconfig keeps JSX for Next.js ("preserve"); component tests need it compiled.
  oxc: { jsx: { runtime: 'automatic' } },
  test: {
    environment: 'node',
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
});
