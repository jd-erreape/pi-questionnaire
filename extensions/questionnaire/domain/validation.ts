export interface ValidationIssue {
  message: string;
  path?: string;
}

export type ValidationResult<T> =
  | {
      ok: true;
      value: T;
    }
  | {
      ok: false;
      issues: ValidationIssue[];
    };
