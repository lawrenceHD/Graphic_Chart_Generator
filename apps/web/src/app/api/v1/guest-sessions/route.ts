import { getGuestHandlers } from '../../../../server/route-exports';

export function POST(request: Request): Promise<Response> {
  return getGuestHandlers().create(request);
}
