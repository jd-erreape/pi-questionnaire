import type { QuestionnaireDraftAnswersDto } from "./questionnaire-draft-answers.js";

export interface QuestionnaireOptionDto {
  label: string;
  description?: string;
}

export interface QuestionnaireQuestionDto {
  header: string;
  question: string;
  options: QuestionnaireOptionDto[];
  multiSelect: boolean;
  allowCustom: boolean;
  required: boolean;
}

export interface QuestionnaireDto {
  requestID: string;
  sessionID: string;
  title?: string;
  instructions?: string;
  questions: QuestionnaireQuestionDto[];
  draftAnswers: QuestionnaireDraftAnswersDto;
}
