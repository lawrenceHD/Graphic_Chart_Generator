import { readProjectEvents, type StoredProjectEvent } from '@app/db';
import type { ProjectEventHub } from './event-hub';
import { guardProject, type RouteDeps, type RouteParams } from './route-guard';

// GET /projects/:id/events (04_API_CONTRACTS.md §5). The stream follows an id cursor over the project_events
// log: it replays what came after Last-Event-ID, then reads again on each wake-up and on each heartbeat, so
// a lost notification costs at most one heartbeat. The stream ends after STREAM_MAX_AGE_MS: the client
// reconnects with Last-Event-ID and its access is checked again.
export interface EventRouteDeps extends RouteDeps {
  readonly hub: ProjectEventHub;
  readonly heartbeatMs?: number;
  readonly maxAgeMs?: number;
  /** A failed read ends the stream (the client reconnects); the cause still reaches the logs. */
  readonly onError: (error: unknown) => void;
}

const HEARTBEAT_MS = 15_000;
const STREAM_MAX_AGE_MS = 10 * 60_000;
const PAGE = 100;
const RETRY_MS = 3_000;
const LAST_EVENT_ID = /^\d{1,15}$/;

type Context = { params: RouteParams };

const frame = ({ id, event }: StoredProjectEvent): string =>
  `id: ${String(id)}\nevent: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;

export function eventHandlers(deps: EventRouteDeps) {
  return {
    async stream(request: Request, context: Context): Promise<Response> {
      const guard = await guardProject(deps, request, context.params, 'project:read');
      if (!guard.ok) return guard.error;
      const projectId = guard.value.params.id;
      const header = request.headers.get('last-event-id')?.trim() ?? '';
      let cursor = LAST_EVENT_ID.test(header) ? Number(header) : 0;

      const encoder = new TextEncoder();
      let stop: (cancelled: boolean) => void = () => undefined;
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          // Shared with the wake-ups that interleave with a read (a plain `let` would be narrowed away).
          const state = { closed: false, reading: false, again: false };
          const send = (text: string): void => {
            if (!state.closed) controller.enqueue(encoder.encode(text));
          };
          const takeAgain = (): boolean => {
            const again = state.again;
            state.again = false;
            return again;
          };
          // One read at a time; a wake-up during a read schedules exactly one more.
          const pump = async (): Promise<void> => {
            if (state.reading) {
              state.again = true;
              return;
            }
            state.reading = true;
            try {
              do {
                // Until a read moves the cursor no further (rows outside the contract move it too).
                for (let before = -1; !state.closed && cursor !== before;) {
                  before = cursor;
                  const page = await readProjectEvents(deps.orm, projectId, cursor, PAGE);
                  for (const stored of page.events) send(frame(stored));
                  cursor = page.cursor;
                }
              } while (takeAgain() && !state.closed);
            } catch (error) {
              deps.onError(error);
              close(false); // the client reconnects with Last-Event-ID
            } finally {
              state.reading = false;
            }
          };
          const unsubscribe = deps.hub.subscribe(projectId, () => void pump());
          const heartbeat = setInterval(() => {
            send(': ping\n\n');
            void pump();
          }, deps.heartbeatMs ?? HEARTBEAT_MS);
          const expiry = setTimeout(() => {
            close(false);
          }, deps.maxAgeMs ?? STREAM_MAX_AGE_MS);
          const onAbort = (): void => {
            close(false);
          };
          const close = (cancelled: boolean): void => {
            if (state.closed) return;
            state.closed = true;
            unsubscribe();
            clearInterval(heartbeat);
            clearTimeout(expiry);
            request.signal.removeEventListener('abort', onAbort);
            if (!cancelled) controller.close(); // a stream cancelled by its reader is closed already
          };
          stop = close;
          request.signal.addEventListener('abort', onAbort);
          send(`retry: ${String(RETRY_MS)}\n\n`);
          void pump();
        },
        cancel() {
          stop(true);
        },
      });
      return new Response(body, {
        headers: {
          'content-type': 'text/event-stream; charset=utf-8',
          'cache-control': 'no-store, no-transform',
          'x-accel-buffering': 'no',
        },
      });
    },
  };
}
