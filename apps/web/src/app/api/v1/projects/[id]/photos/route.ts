import { getPhotoHandlers, type RouteParams } from '../../../../../../server/route-exports';

export function GET(request: Request, context: { params: RouteParams }): Promise<Response> {
  return getPhotoHandlers().list(request, context);
}
