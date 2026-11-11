import { getInspirationHandlers, type RouteParams } from '../../../../../../server/route-exports';

export function GET(request: Request, context: { params: RouteParams }): Promise<Response> {
  return getInspirationHandlers().list(request, context);
}
