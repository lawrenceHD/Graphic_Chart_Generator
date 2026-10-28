// Applies the committed migrations to DATABASE_URL (`pnpm db:migrate`, after building @app/db).
import { createDatabase } from '../../packages/db/dist/index.js';
import { migrateDatabase } from '../../packages/db/dist/migrate.js';

const url = process.env.DATABASE_URL;
if (url === undefined) {
  process.stderr.write('DATABASE_URL is not set\n');
  process.exit(1);
}
const database = createDatabase({ DATABASE_URL: url }, (error) => {
  process.stderr.write(`database pool error: ${error.message}\n`);
});
try {
  await migrateDatabase(database.orm);
  process.stdout.write('migrations applied\n');
} finally {
  await database.pool.end();
}
