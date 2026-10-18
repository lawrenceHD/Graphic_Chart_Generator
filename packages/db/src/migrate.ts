import { fileURLToPath } from 'node:url';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

// Committed SQL migrations, shipped next to the build (packages/db/drizzle).
const MIGRATIONS = fileURLToPath(new URL('../drizzle', import.meta.url));

/** Applies pending migrations; drizzle records them in its own table, so a second run is a no-op. */
export async function migrateDatabase<T extends Record<string, unknown>>(
  orm: NodePgDatabase<T>,
): Promise<void> {
  await migrate(orm, { migrationsFolder: MIGRATIONS });
}
