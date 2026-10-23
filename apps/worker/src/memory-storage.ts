import type { ObjectStorage } from '@app/contracts';
import { err, ok } from '@app/kernel';

/** In-memory stand-in for R2 honouring the port's size limit, for the worker's integration tests. */
export function memoryStorage(objects: Map<string, Uint8Array>): ObjectStorage {
  return {
    presignPut: () => Promise.reject(new Error('not used by the worker')),
    presignGet: () => Promise.reject(new Error('not used by the worker')),
    head: (key) => {
      const bytes = objects.get(key);
      return Promise.resolve(bytes === undefined ? null : { bytes: bytes.length });
    },
    get: (key, maxBytes) => {
      const bytes = objects.get(key);
      if (bytes === undefined) return Promise.resolve(err('NOT_FOUND'));
      return Promise.resolve(bytes.length > maxBytes ? err('TOO_LARGE') : ok(bytes));
    },
    put: (key, bytes) => {
      objects.set(key, bytes);
      return Promise.resolve();
    },
    delete: (key) => {
      objects.delete(key);
      return Promise.resolve();
    },
  };
}
