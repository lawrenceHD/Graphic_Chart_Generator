import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('application startup', () => {
  it('exits in a child process when DATABASE_URL is absent', async () => {
    const childEnvironment: NodeJS.ProcessEnv = {
      ...process.env,
      R2_ACCOUNT_ID: 'local',
      R2_ACCESS_KEY_ID: 'local',
      R2_SECRET_ACCESS_KEY: 'local',
      R2_BUCKET: 'local',
      AI_PROVIDER: 'gemini',
      AI_MODEL: 'local',
      AI_API_KEY: 'local',
      AI_DAILY_BUDGET_EUR: '5',
      AI_USER_DAILY_TOKENS: '1000',
      AUTH_SECRET: 'local',
      APP_URL: 'http://localhost:3001',
      TURNSTILE_SECRET: 'local',
      TURNSTILE_SITE_KEY: 'local',
      EMAIL_API_KEY: 'local',
      EMAIL_FROM: 'noreply@example.invalid',
      SENTRY_DSN: 'https://public@example.invalid/1',
      INTERNAL_PRINT_SECRET: 'local',
      DATABASE_URL: '',
      NEXT_TELEMETRY_DISABLED: '1',
    };

    const output = await new Promise<string>((resolveOutput, rejectOutput) => {
      const child = spawn(
        process.execPath,
        [resolve(process.cwd(), 'node_modules/next/dist/bin/next'), 'dev', '--port', '43127'],
        {
          cwd: process.cwd(),
          env: childEnvironment,
          stdio: ['ignore', 'pipe', 'pipe'],
        },
      );
      let outputText = '';
      // Generous: under a parallel `pnpm verify`, Next.js alone can take 10 s to get ready.
      const timeout = setTimeout(() => child.kill(), 45_000);

      child.stdout.on('data', (chunk: Buffer) => {
        outputText += chunk.toString();
      });
      child.stderr.on('data', (chunk: Buffer) => {
        outputText += chunk.toString();
      });
      child.once('error', (error: Error) => {
        clearTimeout(timeout);
        rejectOutput(error);
      });
      child.once('exit', (code) => {
        clearTimeout(timeout);
        if (code === 0) {
          rejectOutput(new Error('Next.js unexpectedly started without DATABASE_URL.'));
          return;
        }
        resolveOutput(outputText);
      });
    });

    expect(output).toContain('Invalid environment variables: DATABASE_URL');
  }, 50_000);
});
