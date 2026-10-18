import { createDatabase } from '@app/db';
import { appLogger } from '../logger';
import { errorSummary } from './error-summary';
import { getRuntimeEnv } from './runtime-env';

let databaseInstance: ReturnType<typeof createDatabase> | undefined;

export function getDatabase(): ReturnType<typeof createDatabase> {
  databaseInstance ??= createDatabase(getRuntimeEnv(), (error) => {
    appLogger().error({ event: 'database_pool_error', error: errorSummary(error) });
  });
  return databaseInstance;
}
