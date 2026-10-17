// Foreseeable failures are values, not exceptions (AGENTS.md §4). Results are frozen so a
// pure function can return them without callers being able to alter shared state.
export type Ok<T> = { readonly ok: true; readonly value: T };
export type Err<E> = { readonly ok: false; readonly error: E };
export type Result<T, E> = Ok<T> | Err<E>;

export function ok<T>(value: T): Ok<T> {
  return Object.freeze({ ok: true, value });
}

export function err<E>(error: E): Err<E> {
  return Object.freeze({ ok: false, error });
}

export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
  return result.ok;
}

export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
  return !result.ok;
}
