import { getProjectHandlers } from '../../../../server/route-exports';

export function GET(request: Request): Promise<Response> {
  return getProjectHandlers().list(request);
}

export function POST(request: Request): Promise<Response> {
  return getProjectHandlers().create(request);
}
