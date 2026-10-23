import { getAnalysisHandlers, type RouteParams } from '../../../../../../server/route-exports';

type Context = { params: RouteParams };

export function POST(request: Request, context: Context): Promise<Response> {
  return getAnalysisHandlers().analyze(request, context);
}
