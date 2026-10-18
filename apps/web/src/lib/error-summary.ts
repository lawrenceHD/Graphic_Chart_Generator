// Logs identify a failure by class and driver code only: messages may echo hosts, queries or user data.
export function errorSummary(cause: unknown): { readonly name: string; readonly code?: string } {
  if (!(cause instanceof Error)) return { name: typeof cause };
  const code: unknown = Reflect.get(cause, 'code');
  return typeof code === 'string' ? { name: cause.name, code } : { name: cause.name };
}
