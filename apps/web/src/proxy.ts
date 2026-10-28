import type { NextRequest, NextResponse } from 'next/server';
import { getRuntimeEnv } from './lib/runtime-env';
import { secureResponse } from './security-headers';

export function proxy(request: NextRequest): NextResponse {
  return secureResponse(request, {
    r2AccountId: getRuntimeEnv().R2_ACCOUNT_ID,
    storageEndpoint: getRuntimeEnv().R2_ENDPOINT,
    development: process.env.NODE_ENV === 'development',
  });
}
