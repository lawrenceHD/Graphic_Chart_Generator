import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    exclude: ['**/node_modules/**', '**/dist/**'],
    // Property tests take ~0.6 s alone but exceeded 5 s while `pnpm verify` tests the whole monorepo in parallel.
    testTimeout: 20_000,
  },
});
