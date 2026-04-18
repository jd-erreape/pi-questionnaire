import type { QuestionnaireAnswerState } from "../../domain/questionnaire.js";
import type { QuestionnaireAnswerStateDto } from "../dto/questionnaire-answer-state.js";

export function toQuestionnaireAnswerStateDto(
  answerState: QuestionnaireAnswerState,
): QuestionnaireAnswerStateDto {
  return answerState.map((slot) => ({
    selections: slot.selections.map((selection) => ({ ...selection })),
  }));
}
