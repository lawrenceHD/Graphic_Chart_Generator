import { getEventHandlers, type RouteParams } from '../../../../../../server/route-exports';

type Context = { params: RouteParams };

export function GET(request: Request, context: Context): Promise<Response> {
  return getEventHandlers().stream(request, context);
}
