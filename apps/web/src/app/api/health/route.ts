import { z } from 'zod';
import { getDatabase } from '../../../lib/database';
import { createHealthResponse } from '../../../health-response';
import { requestLogger } from '../../../logger';

const requestIdSchema = z.uuid();

export async function GET(request: Request): Promise<Response> {
  const headerValue = request.headers.get('x-request-id');
  const requestId = requestIdSchema.safeParse(headerValue);
  const logger = requestLogger(requestId.success ? requestId.data : 'unknown');
  const response = await createHealthResponse(() => getDatabase().pool.query('SELECT 1'));

  logger.info({ event: 'health_check', status: response.status === 200 ? 'ok' : 'degraded' });
  return response;
}
