import { normalizeQuestionnaireRequest } from "../../domain/policies/normalizeQuestionnaireRequest.js";
import { validateQuestionnaireRequest } from "../../domain/policies/validateQuestionnaireRequest.js";
import type { QuestionnaireDefinition } from "../../domain/definition.js";
import type { ValidationResult } from "../../domain/validation.js";

export type PrepareQuestionnaireRequestResult =
  ValidationResult<QuestionnaireDefinition>;

export function prepareQuestionnaireRequest(
  input: unknown,
): PrepareQuestionnaireRequestResult {
  const validationResult = validateQuestionnaireRequest(input);

  if (!validationResult.ok) {
    return {
      ok: false,
      issues: validationResult.issues,
    };
  }

  return {
    ok: true,
    value: normalizeQuestionnaireRequest(validationResult.value),
  };
}
