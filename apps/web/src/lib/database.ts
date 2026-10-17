import { createDatabase } from '@app/db';
import { getRuntimeEnv } from './runtime-env';

let databaseInstance: ReturnType<typeof createDatabase> | undefined;

export function getDatabase(): ReturnType<typeof createDatabase> {
  databaseInstance ??= createDatabase(getRuntimeEnv());
  return databaseInstance;
}
