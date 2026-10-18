export type HealthFailureHandler = (cause: unknown) => void;

// The response never carries the cause (docs/04_API_CONTRACTS.md §2); the caller logs it.
export async function createHealthResponse(
  query: () => Promise<unknown>,
  onFailure: HealthFailureHandler = () => undefined,
): Promise<Response> {
  try {
    await query();
    return Response.json({ status: 'ok' }, { status: 200 });
  } catch (cause) {
    onFailure(cause);
    return Response.json({ status: 'degraded' }, { status: 503 });
  }
}
