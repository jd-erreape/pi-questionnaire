export interface OkResult<T> {
  ok: true;
  value: T;
}

export interface ErrorResult<E extends Error> {
  ok: false;
  error: E;
}

export type Result<T, E extends Error> = OkResult<T> | ErrorResult<E>;

function ok(): Result<void, never>;
function ok<T>(value: T): Result<T, never>;
function ok<T>(value?: T): Result<T | void, never> {
  return { ok: true, value };
}

function error<E extends Error>(resultError: E): Result<never, E> {
  return { ok: false, error: resultError };
}

export const Result = {
  ok,
  error,
} as const;
