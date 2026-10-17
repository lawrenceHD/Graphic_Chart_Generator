import { loadEnv, type Env } from '@app/contracts';

let runtimeEnv: Env | undefined;

export function requireEnv(source: unknown): Env {
  const result = loadEnv(source);

  if (!result.ok) {
    // Names only: values may be secrets (docs/02_ARCHITECTURE.md §6).
    throw new Error(`Invalid environment variables: ${result.error.invalidVariables.join(', ')}`);
  }

  return result.value;
}

export function getRuntimeEnv(): Env {
  runtimeEnv ??= requireEnv(process.env);
  return runtimeEnv;
}
