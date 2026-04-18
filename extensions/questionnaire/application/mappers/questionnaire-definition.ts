import type { QuestionnaireDefinition } from "../../domain/definition.js";
import type { QuestionnaireDefinitionDto } from "../dto/questionnaire-definition.js";

export function toQuestionnaireDefinitionDto(
  definition: QuestionnaireDefinition,
): QuestionnaireDefinitionDto {
  return {
    ...(definition.title !== undefined ? { title: definition.title } : {}),
    ...(definition.instructions !== undefined
      ? { instructions: definition.instructions }
      : {}),
    questions: definition.questions.map((question) => ({
      header: question.header,
      question: question.question,
      options: question.options.map((option) => ({
        label: option.label,
        ...(option.description !== undefined
          ? { description: option.description }
          : {}),
      })),
      multiSelect: question.multiSelect,
      allowCustom: question.allowCustom,
      required: question.required,
    })),
  };
}
