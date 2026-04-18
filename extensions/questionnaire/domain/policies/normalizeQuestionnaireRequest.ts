import type { QuestionnaireInputDto } from "../../application/dto/questionnaire-input.js";
import type { QuestionnaireDefinition } from "../definition.js";

export function normalizeQuestionnaireRequest(
  request: QuestionnaireInputDto,
): QuestionnaireDefinition {
  const title = trimOptionalString(request.title);
  const instructions = trimOptionalString(request.instructions);

  return {
    ...(title === undefined ? {} : { title }),
    ...(instructions === undefined ? {} : { instructions }),
    questions: request.questions.map((question) => ({
      header: question.header.trim(),
      question: question.question.trim(),
      options: question.options.map((option) => {
        const description = trimOptionalString(option.description);

        return {
          label: option.label.trim(),
          ...(description === undefined ? {} : { description }),
        };
      }),
      multiSelect: question.multiSelect ?? false,
      allowCustom: question.allowCustom ?? true,
      required: question.required ?? true,
    })),
  };
}

function trimOptionalString(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length === 0 ? undefined : trimmedValue;
}
