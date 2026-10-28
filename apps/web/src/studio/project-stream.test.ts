// @vitest-environment jsdom
import type { ProjectEvent } from '@app/contracts';
import { describe, expect, it } from 'vitest';
import { FakeEventSource } from './fake-event-source';
import { subscribeProjectEvents, type StreamState } from './project-stream';

const PROJECT = '0190a0b0-0000-7000-8000-00000000000a';

function subscribe() {
  const events: ProjectEvent[] = [];
  const connection: StreamState[] = [];
  let source: FakeEventSource | undefined;
  const stop = subscribeProjectEvents(
    PROJECT,
    { event: (event) => events.push(event), connection: (up) => connection.push(up) },
    (url) => (source = new FakeEventSource(url)),
  );
  if (source === undefined) throw new Error('no stream opened');
  return { events, connection, source, stop };
}

describe('subscribeProjectEvents (04 §5)', () => {
  it('opens the project stream and passes valid events', () => {
    const { events, source } = subscribe();
    expect(source.url).toBe(`/api/v1/projects/${PROJECT}/events`);
    source.emit('analysis.step', { step: 1, state: 'running' });
    source.emit('analysis.done', { seq: 2 });
    expect(events).toEqual([
      { type: 'analysis.step', data: { step: 1, state: 'running' } },
      { type: 'analysis.done', data: { seq: 2 } },
    ]);
  });

  it('drops events that break the contract', () => {
    const { events, source } = subscribe();
    source.emit('analysis.step', { step: 9, state: 'running' });
    source.emit('analysis.done', '{');
    expect(events).toEqual([]);
  });

  it('tells a reconnection (EventSource retries by itself) from a final close', () => {
    const { connection, source } = subscribe();
    source.emit('error', null);
    source.emit('open', null);
    source.readyState = 2;
    source.emit('error', null);
    expect(connection).toEqual(['reconnecting', 'open', 'closed']);
  });

  it('closes the stream when unsubscribed', () => {
    const { source, stop } = subscribe();
    stop();
    expect(source.closed).toBe(true);
  });
});
