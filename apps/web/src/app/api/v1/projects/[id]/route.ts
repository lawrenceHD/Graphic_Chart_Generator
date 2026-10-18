import { getProjectHandlers, type RouteParams } from '../../../../../server/route-exports';

type Context = { params: RouteParams };

export function GET(request: Request, context: Context): Promise<Response> {
  return getProjectHandlers().read(request, context);
}

export function PATCH(request: Request, context: Context): Promise<Response> {
  return getProjectHandlers().update(request, context);
}

export function DELETE(request: Request, context: Context): Promise<Response> {
  return getProjectHandlers().remove(request, context);
}
