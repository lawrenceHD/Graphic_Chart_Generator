import { parseProjectEvent, type ProjectEvent } from '@app/contracts';

// Browser side of GET /projects/:id/events (04 §5). EventSource sends Last-Event-ID and reconnects by
// itself; each event is validated against the contract before it reaches the interface.
export interface EventSourceLike {
  addEventListener(type: string, listener: (event: MessageEvent<string>) => void): void;
  /** 2 (CLOSED) once the browser gave up: an HTTP error such as 401, 403 or 404 is final. */
  readonly readyState: number;
  close(): void;
}

export interface ProjectStreamHandlers {
  readonly event: (event: ProjectEvent) => void;
  readonly connection: (state: StreamState) => void;
}

/** `reconnecting`: the browser retries by itself; `closed`: it gave up, only a reload helps. */
export type StreamState = 'open' | 'reconnecting' | 'closed';

const CLOSED = 2;
const EVENT_TYPES = ['asset.status', 'analysis.step', 'analysis.done', 'export.status'] as const;

const openEventSource = (url: string): EventSourceLike => new EventSource(url);

function readData(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined; // refused just below by the contract, like any other malformed event
  }
}

export function subscribeProjectEvents(
  projectId: string,
  handlers: ProjectStreamHandlers,
  open: (url: string) => EventSourceLike = openEventSource,
): () => void {
  const source = open(`/api/v1/projects/${encodeURIComponent(projectId)}/events`);
  for (const type of EVENT_TYPES) {
    source.addEventListener(type, (message) => {
      const event = parseProjectEvent(type, readData(message.data));
      if (event !== null) handlers.event(event);
    });
  }
  source.addEventListener('error', () => {
    handlers.connection(source.readyState === CLOSED ? 'closed' : 'reconnecting');
  });
  source.addEventListener('open', () => {
    handlers.connection('open');
  });
  return () => {
    source.close();
  };
}
