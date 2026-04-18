import type { Result } from "../result.js";
import type { QuestionnaireValidationError } from "./errors.js";

export type ValidationResult<T> = Result<T, QuestionnaireValidationError>;
