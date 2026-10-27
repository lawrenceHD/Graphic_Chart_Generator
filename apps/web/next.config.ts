import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadEnvFile } from 'node:process';

// Secrets live in the monorepo root .env.local, shared by every app.
const rootEnvFile = resolve(import.meta.dirname, '../../.env.local');
if (existsSync(rootEnvFile)) {
  loadEnvFile(rootEnvFile);
}

// The repository AGENTS.md is the only agent guidance (ADR-026).
const nextConfig: NextConfig = { agentRules: false };

export default createNextIntlPlugin('./src/i18n/request.ts')(nextConfig);
