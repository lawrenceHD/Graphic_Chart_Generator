import { Writable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { createLogger } from './logger';

describe('request logger', () => {
  it('adds a requestId and redacts sensitive fields', () => {
    const lines: string[] = [];
    const destination = new Writable({
      write(chunk: Buffer, _encoding, callback) {
        lines.push(chunk.toString());
        callback();
      },
    });
    const logger = createLogger(destination).child({ requestId: 'request-123' });

    logger.info({
      authorization: 'authorization-sentinel',
      cookie: 'cookie-sentinel',
      password: 'password-sentinel',
      token: 'token-sentinel',
    });

    const output = lines.join('');
    expect(output).toContain('"requestId":"request-123"');
    expect(output).toContain('[REDACTED]');
    expect(output).not.toContain('authorization-sentinel');
    expect(output).not.toContain('cookie-sentinel');
    expect(output).not.toContain('password-sentinel');
    expect(output).not.toContain('token-sentinel');
  });

  it('redacts sensitive keys at any depth and in any case', () => {
    const lines: string[] = [];
    const destination = new Writable({
      write(chunk: Buffer, _encoding, callback) {
        lines.push(chunk.toString());
        callback();
      },
    });

    createLogger(destination).info({
      headers: { Authorization: 'leak-a', 'Set-Cookie': 'leak-b' },
      err: { config: { headers: { authorization: 'leak-c' } } },
      items: [{ apiKey: 'leak-d' }, { client_secret: 'leak-e' }],
      refreshToken: 'leak-f',
      safe: 'kept',
    });

    const output = lines.join('');
    expect(output.match(/leak-[a-f]/g)).toBeNull();
    expect(output).toContain('"safe":"kept"');
  });
});
