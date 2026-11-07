import { getAccountHandlers } from '../../../../server/route-exports';

export function DELETE(request: Request): Promise<Response> {
  return getAccountHandlers().remove(request);
}
