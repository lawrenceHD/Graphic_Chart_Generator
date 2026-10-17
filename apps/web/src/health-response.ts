export async function createHealthResponse(query: () => Promise<unknown>): Promise<Response> {
  try {
    await query();
    return Response.json({ status: 'ok' }, { status: 200 });
  } catch {
    return Response.json({ status: 'degraded' }, { status: 503 });
  }
}
