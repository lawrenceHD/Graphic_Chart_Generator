import { afterEach, describe, expect, it } from 'vitest';
import { createDatabase } from './index.js';

describe('createDatabase', () => {
  const pools: { end: () => Promise<void> }[] = [];
  afterEach(async () => {
    await Promise.all(pools.splice(0).map((pool) => pool.end()));
  });

  it('routes idle-client errors to the handler instead of crashing the process', () => {
    const received: Error[] = [];
    const database = createDatabase(
      { DATABASE_URL: 'postgresql://user:secret@127.0.0.1:1/none' },
      (error) => received.push(error),
    );
    pools.push(database.pool);

    // Without a listener, EventEmitter rethrows 'error' and Node exits (pg-pool README).
    expect(() =>
      database.pool.emit('error', new Error('terminated by administrator')),
    ).not.toThrow();
    expect(received.map((error) => error.message)).toEqual(['terminated by administrator']);
  });
});
