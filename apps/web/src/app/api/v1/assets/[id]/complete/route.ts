import { getAssetHandlers, type RouteParams } from '../../../../../../server/route-exports';

type Context = { params: RouteParams };

export function POST(request: Request, context: Context): Promise<Response> {
  return getAssetHandlers().complete(request, context);
}
