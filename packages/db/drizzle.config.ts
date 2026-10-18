import { defineConfig } from 'drizzle-kit';

// Migrations are generated from the schema and committed (03_DATA_MODEL.md §1); never pushed to production.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/index.ts',
  out: './drizzle',
  strict: true,
});
