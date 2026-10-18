import { getDocumentHandlers, type RouteParams } from '../../../../../../server/route-exports';

export function POST(request: Request, context: { params: RouteParams }): Promise<Response> {
  return getDocumentHandlers().redo(request, context);
}
