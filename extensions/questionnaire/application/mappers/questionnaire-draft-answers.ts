import type { QuestionnaireAnswerState } from "../../domain/questionnaire.js";
import type { QuestionnaireDraftAnswersDto } from "../dto/questionnaire-draft-answers.js";

export function toQuestionnaireDraftAnswersDto(
  answerState: QuestionnaireAnswerState,
): QuestionnaireDraftAnswersDto {
  return answerState.map((slot) => ({
    selections: slot.selections.map((selection) => ({ ...selection })),
  }));
}
