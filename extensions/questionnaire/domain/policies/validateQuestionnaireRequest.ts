import type {
  QuestionnaireOptionDto,
  QuestionnaireQuestionDto,
  QuestionnaireRequestDto,
} from "../../contract/request.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";

const REQUEST_FIELDS = new Set(["title", "instructions", "questions"]);
const QUESTION_FIELDS = new Set([
  "header",
  "question",
  "options",
  "multiSelect",
  "allowCustom",
  "required",
]);
const OPTION_FIELDS = new Set(["label", "description"]);

export function validateQuestionnaireRequest(
  input: unknown,
): ValidationResult<QuestionnaireRequestDto> {
  if (!isRecord(input)) {
    return {
      ok: false,
      issues: [{ message: "request must be an object" }],
    };
  }

  const issues: ValidationIssue[] = [];

  validateUnknownFields(
    input,
    REQUEST_FIELDS,
    "unknown top-level field",
    issues,
  );
  validateOptionalStringField(input.title, "title", issues);
  validateOptionalStringField(input.instructions, "instructions", issues);

  if (!("questions" in input)) {
    issues.push({ message: "questions is required" });
  } else if (!Array.isArray(input.questions)) {
    issues.push({ message: "questions must be an array" });
  } else {
    validateQuestionArray(input.questions, issues);
  }

  if (issues.length > 0) {
    return {
      ok: false,
      issues,
    };
  }

  return {
    ok: true,
    value: toQuestionnaireRequestDto(input),
  };
}

function validateQuestionArray(
  questions: unknown[],
  issues: ValidationIssue[],
): void {
  if (questions.length < 1 || questions.length > 5) {
    issues.push({ message: "questions must contain between 1 and 5 items" });
    return;
  }

  questions.forEach((question, questionIndex) => {
    validateQuestion(question, questionIndex, issues);
  });
}

function validateQuestion(
  question: unknown,
  questionIndex: number,
  issues: ValidationIssue[],
): void {
  if (!isRecord(question)) {
    issues.push({
      message: `question at index ${questionIndex} must be an object`,
    });
    return;
  }

  validateUnknownFields(
    question,
    QUESTION_FIELDS,
    `question at index ${questionIndex} has unknown field`,
    issues,
  );

  validateRequiredStringField(
    question.header,
    `question at index ${questionIndex} field header`,
    issues,
  );
  validateRequiredStringField(
    question.question,
    `question at index ${questionIndex} field question`,
    issues,
  );

  validateOptionalBooleanField(
    question.multiSelect,
    `question at index ${questionIndex} field multiSelect`,
    issues,
  );
  validateOptionalBooleanField(
    question.allowCustom,
    `question at index ${questionIndex} field allowCustom`,
    issues,
  );
  validateOptionalBooleanField(
    question.required,
    `question at index ${questionIndex} field required`,
    issues,
  );

  if (!("options" in question)) {
    issues.push({
      message: `question at index ${questionIndex} field options is required`,
    });
    return;
  }
  if (!Array.isArray(question.options)) {
    issues.push({
      message: `question at index ${questionIndex} field options must be an array`,
    });
    return;
  }
  if (question.options.length < 2 || question.options.length > 5) {
    issues.push({
      message: `question at index ${questionIndex} options must contain between 2 and 5 items`,
    });
    return;
  }

  const normalizedLabels = new Set<string>();

  question.options.forEach((option, optionIndex) => {
    const normalizedLabel = validateOption(
      option,
      questionIndex,
      optionIndex,
      issues,
    );

    if (!normalizedLabel) {
      return;
    }

    if (normalizedLabels.has(normalizedLabel)) {
      issues.push({
        message: `question at index ${questionIndex} has duplicate option label after trimming and case-folding: "${normalizedLabel}"`,
      });
      return;
    }

    normalizedLabels.add(normalizedLabel);
  });
}

function validateOption(
  option: unknown,
  questionIndex: number,
  optionIndex: number,
  issues: ValidationIssue[],
): string | undefined {
  if (!isRecord(option)) {
    issues.push({
      message: `option at index ${optionIndex} in question ${questionIndex} must be an object`,
    });
    return undefined;
  }

  validateUnknownFields(
    option,
    OPTION_FIELDS,
    `option at index ${optionIndex} in question ${questionIndex} has unknown field`,
    issues,
  );

  validateOptionalStringField(
    option.description,
    `option at index ${optionIndex} in question ${questionIndex} field description`,
    issues,
  );

  if (!("label" in option)) {
    issues.push({
      message: `option at index ${optionIndex} in question ${questionIndex} field label is required`,
    });
    return undefined;
  }

  if (typeof option.label !== "string") {
    issues.push({
      message: `option at index ${optionIndex} in question ${questionIndex} field label must be a string`,
    });
    return undefined;
  }

  const trimmedLabel = option.label.trim();
  if (trimmedLabel.length === 0) {
    issues.push({
      message: `option at index ${optionIndex} in question ${questionIndex} field label must not be empty`,
    });
    return undefined;
  }

  return trimmedLabel.toLocaleLowerCase();
}

function validateUnknownFields(
  value: Record<string, unknown>,
  allowedFields: Set<string>,
  prefix: string,
  issues: ValidationIssue[],
): void {
  Object.keys(value).forEach((key) => {
    if (!allowedFields.has(key)) {
      issues.push({ message: `${prefix}: ${key}` });
    }
  });
}

function validateRequiredStringField(
  value: unknown,
  fieldLabel: string,
  issues: ValidationIssue[],
): void {
  if (typeof value !== "string") {
    issues.push({ message: `${fieldLabel} must be a string` });
    return;
  }

  if (value.trim().length === 0) {
    issues.push({ message: `${fieldLabel} must not be empty` });
  }
}

function validateOptionalStringField(
  value: unknown,
  fieldLabel: string,
  issues: ValidationIssue[],
): void {
  if (value === undefined) {
    return;
  }

  if (typeof value !== "string") {
    issues.push({ message: `${fieldLabel} must be a string` });
  }
}

function validateOptionalBooleanField(
  value: unknown,
  fieldLabel: string,
  issues: ValidationIssue[],
): void {
  if (value === undefined) {
    return;
  }

  if (typeof value !== "boolean") {
    issues.push({ message: `${fieldLabel} must be a boolean` });
  }
}

function toQuestionnaireRequestDto(
  input: Record<string, unknown>,
): QuestionnaireRequestDto {
  const questions = (input.questions as unknown[]).map((question) =>
    toQuestionnaireQuestionDto(question as Record<string, unknown>),
  );

  return {
    ...(typeof input.title === "string" ? { title: input.title } : {}),
    ...(typeof input.instructions === "string"
      ? { instructions: input.instructions }
      : {}),
    questions,
  };
}

function toQuestionnaireQuestionDto(
  question: Record<string, unknown>,
): QuestionnaireQuestionDto {
  return {
    header: question.header as string,
    question: question.question as string,
    options: (question.options as unknown[]).map((option) =>
      toQuestionnaireOptionDto(option as Record<string, unknown>),
    ),
    ...(typeof question.multiSelect === "boolean"
      ? { multiSelect: question.multiSelect }
      : {}),
    ...(typeof question.allowCustom === "boolean"
      ? { allowCustom: question.allowCustom }
      : {}),
    ...(typeof question.required === "boolean"
      ? { required: question.required }
      : {}),
  };
}

function toQuestionnaireOptionDto(
  option: Record<string, unknown>,
): QuestionnaireOptionDto {
  return {
    label: option.label as string,
    ...(typeof option.description === "string"
      ? { description: option.description }
      : {}),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
