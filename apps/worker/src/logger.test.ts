import { Writable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { createLogger, errorSummary } from './logger.js';

describe('worker logger', () => {
  it('redacts sensitive keys at any depth and summarises errors without their message', () => {
    const lines: string[] = [];
    const destination = new Writable({
      write(chunk: Buffer, _encoding, callback) {
        lines.push(chunk.toString());
        callback();
      },
    });
    const failure = Object.assign(new Error('postgres://user:pw@host/db refused'), {
      code: 'ECONNREFUSED',
    });
    createLogger(destination).error({
      event: 'x',
      job: { headers: { Authorization: 'auth-sentinel' }, r2: { secretAccessKey: 'key-sentinel' } },
      error: errorSummary(failure),
    });
    const output = lines.join('');
    expect(output).toContain('"event":"x"');
    expect(output).toContain('"error":{"name":"Error","code":"ECONNREFUSED"}');
    expect(output).not.toContain('auth-sentinel');
    expect(output).not.toContain('key-sentinel');
    expect(output).not.toContain('postgres://');
  });
});
