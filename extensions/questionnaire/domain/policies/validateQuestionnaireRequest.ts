import type { QuestionnaireOptionDto } from "../../application/dto/questionnaire-definition.js";
import type {
  QuestionnaireInputDto,
  QuestionnaireInputQuestionDto,
} from "../../application/dto/questionnaire-input.js";
import { Result, type Result as ResultType } from "../../result.js";
import {
  QuestionnaireValidationError,
  type ValidationProblem,
} from "../errors.js";

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
): ResultType<QuestionnaireInputDto, QuestionnaireValidationError> {
  if (!isRecord(input)) {
    return Result.error(
      new QuestionnaireValidationError([
        { message: "request must be an object" },
      ]),
    );
  }

  const problems: ValidationProblem[] = [];

  validateUnknownFields(
    input,
    REQUEST_FIELDS,
    "unknown top-level field",
    problems,
  );
  validateOptionalStringField(input.title, "title", problems);
  validateOptionalStringField(input.instructions, "instructions", problems);

  if (!("questions" in input)) {
    problems.push({ message: "questions is required" });
  } else if (!Array.isArray(input.questions)) {
    problems.push({ message: "questions must be an array" });
  } else {
    validateQuestionArray(input.questions, problems);
  }

  if (problems.length > 0) {
    return Result.error(new QuestionnaireValidationError(problems));
  }

  return Result.ok(toQuestionnaireInputDto(input));
}

function validateQuestionArray(
  questions: unknown[],
  problems: ValidationProblem[],
): void {
  if (questions.length < 1 || questions.length > 5) {
    problems.push({ message: "questions must contain between 1 and 5 items" });
    return;
  }

  questions.forEach((question, questionIndex) => {
    validateQuestion(question, questionIndex, problems);
  });
}

function validateQuestion(
  question: unknown,
  questionIndex: number,
  problems: ValidationProblem[],
): void {
  if (!isRecord(question)) {
    problems.push({
      message: `question at index ${questionIndex} must be an object`,
    });
    return;
  }

  validateUnknownFields(
    question,
    QUESTION_FIELDS,
    `question at index ${questionIndex} has unknown field`,
    problems,
  );

  validateRequiredStringField(
    question.header,
    `question at index ${questionIndex} field header`,
    problems,
  );
  validateRequiredStringField(
    question.question,
    `question at index ${questionIndex} field question`,
    problems,
  );

  validateOptionalBooleanField(
    question.multiSelect,
    `question at index ${questionIndex} field multiSelect`,
    problems,
  );
  validateOptionalBooleanField(
    question.allowCustom,
    `question at index ${questionIndex} field allowCustom`,
    problems,
  );
  validateOptionalBooleanField(
    question.required,
    `question at index ${questionIndex} field required`,
    problems,
  );

  if (!("options" in question)) {
    problems.push({
      message: `question at index ${questionIndex} field options is required`,
    });
    return;
  }
  if (!Array.isArray(question.options)) {
    problems.push({
      message: `question at index ${questionIndex} field options must be an array`,
    });
    return;
  }
  if (question.options.length < 2 || question.options.length > 5) {
    problems.push({
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
      problems,
    );

    if (!normalizedLabel) {
      return;
    }

    if (normalizedLabels.has(normalizedLabel)) {
      problems.push({
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
  problems: ValidationProblem[],
): string | undefined {
  if (!isRecord(option)) {
    problems.push({
      message: `option at index ${optionIndex} in question ${questionIndex} must be an object`,
    });
    return undefined;
  }

  validateUnknownFields(
    option,
    OPTION_FIELDS,
    `option at index ${optionIndex} in question ${questionIndex} has unknown field`,
    problems,
  );

  validateOptionalStringField(
    option.description,
    `option at index ${optionIndex} in question ${questionIndex} field description`,
    problems,
  );

  if (!("label" in option)) {
    problems.push({
      message: `option at index ${optionIndex} in question ${questionIndex} field label is required`,
    });
    return undefined;
  }

  if (typeof option.label !== "string") {
    problems.push({
      message: `option at index ${optionIndex} in question ${questionIndex} field label must be a string`,
    });
    return undefined;
  }

  const trimmedLabel = option.label.trim();
  if (trimmedLabel.length === 0) {
    problems.push({
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
  problems: ValidationProblem[],
): void {
  Object.keys(value).forEach((key) => {
    if (!allowedFields.has(key)) {
      problems.push({ message: `${prefix}: ${key}` });
    }
  });
}

function validateRequiredStringField(
  value: unknown,
  fieldLabel: string,
  problems: ValidationProblem[],
): void {
  if (typeof value !== "string") {
    problems.push({ message: `${fieldLabel} must be a string` });
    return;
  }

  if (value.trim().length === 0) {
    problems.push({ message: `${fieldLabel} must not be empty` });
  }
}

function validateOptionalStringField(
  value: unknown,
  fieldLabel: string,
  problems: ValidationProblem[],
): void {
  if (value === undefined) {
    return;
  }

  if (typeof value !== "string") {
    problems.push({ message: `${fieldLabel} must be a string` });
  }
}

function validateOptionalBooleanField(
  value: unknown,
  fieldLabel: string,
  problems: ValidationProblem[],
): void {
  if (value === undefined) {
    return;
  }

  if (typeof value !== "boolean") {
    problems.push({ message: `${fieldLabel} must be a boolean` });
  }
}

function toQuestionnaireInputDto(
  input: Record<string, unknown>,
): QuestionnaireInputDto {
  const questions = (input.questions as unknown[]).map((question) =>
    toQuestionnaireInputQuestionDto(question as Record<string, unknown>),
  );

  return {
    ...(typeof input.title === "string" ? { title: input.title } : {}),
    ...(typeof input.instructions === "string"
      ? { instructions: input.instructions }
      : {}),
    questions,
  };
}

function toQuestionnaireInputQuestionDto(
  question: Record<string, unknown>,
): QuestionnaireInputQuestionDto {
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
