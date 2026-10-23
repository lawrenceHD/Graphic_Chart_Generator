import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Rasterising spawns an isolated child process per render (SEC-15): under the parallel turbo run of
    // pnpm verify, a test doing dozens of renders can pass the 5 s default.
    testTimeout: 30_000,
    // Each suite creates its own migrated database, slow when every package's tests run at once.
    hookTimeout: 30_000,
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
});
