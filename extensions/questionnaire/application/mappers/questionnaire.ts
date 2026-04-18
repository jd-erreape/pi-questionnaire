import type { Questionnaire } from "../../domain/questionnaire.js";
import type { QuestionnaireDto } from "../dto/questionnaire.js";

export function toQuestionnaireDto(
  questionnaire: Questionnaire,
): QuestionnaireDto {
  const definition = questionnaire.getDefinition();
  const draftAnswers = questionnaire.toAnswerState();

  return {
    requestID: questionnaire.getRequestID(),
    sessionID: questionnaire.getSessionID(),
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
    draftAnswers: draftAnswers.map((slot) => ({
      selections: slot.selections.map((selection) => ({ ...selection })),
    })),
  };
}
