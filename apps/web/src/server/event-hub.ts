import type { ProjectEventListener } from '@app/db';

// Fan-out of the process's single LISTEN connection to the open SSE streams. A wake-up only says "read
// again": streams read the log themselves, so a lost or duplicated notification never loses or repeats an
// event. The connection starts with the first subscriber, never at import time.
export interface ProjectEventHub {
  /** Calls `wake` after each committed event of the project; returns the unsubscribe function. */
  subscribe(projectId: string, wake: () => void): () => void;
}

export type StartListener = (handlers: {
  readonly onProject: (projectId: string) => void;
  readonly onResync: () => void;
  readonly onError: (error: Error) => void;
}) => Promise<ProjectEventListener>;

export function createProjectEventHub(
  start: StartListener,
  onError: (error: Error) => void,
): ProjectEventHub {
  const subscribers = new Map<string, Set<() => void>>();
  let listener: Promise<ProjectEventListener> | undefined;
  const wakeAll = (wakes: Iterable<() => void>): void => {
    for (const wake of wakes) wake();
  };

  const ensureListening = (): void => {
    listener ??= start({
      onProject: (projectId) => {
        wakeAll(subscribers.get(projectId) ?? []);
      },
      onResync: () => {
        wakeAll([...subscribers.values()].flatMap((set) => [...set]));
      },
      onError,
    });
    // A failed start is retried by the next subscriber; streams meanwhile catch up on their heartbeat.
    listener.catch((error: unknown) => {
      listener = undefined;
      onError(error instanceof Error ? error : new Error(String(error)));
    });
  };

  return {
    subscribe(projectId, wake) {
      ensureListening();
      const set = subscribers.get(projectId) ?? new Set();
      set.add(wake);
      subscribers.set(projectId, set);
      return () => {
        set.delete(wake);
        if (set.size === 0) subscribers.delete(projectId);
      };
    },
  };
}
