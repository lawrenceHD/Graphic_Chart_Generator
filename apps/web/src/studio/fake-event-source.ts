import type { EventSourceLike } from './project-stream';

/** In-memory EventSource for tests: `emit` plays a server-sent event. */
export class FakeEventSource implements EventSourceLike {
  readonly listeners = new Map<string, Array<(event: MessageEvent<string>) => void>>();
  closed = false;
  readyState = 0;

  constructor(readonly url: string) {}

  addEventListener(type: string, listener: (event: MessageEvent<string>) => void): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  emit(type: string, data: unknown): void {
    const event = new MessageEvent('message', { data: JSON.stringify(data) });
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }

  close(): void {
    this.closed = true;
  }
}
