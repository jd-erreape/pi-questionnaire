import type { QuestionnaireInstanceDto } from "./questionnaire-instance.js";

export interface QuestionnaireSubmittedResponseDto {
  question: string;
  selections: string[];
}

export interface SubmittedQuestionnaireDto {
  instance: QuestionnaireInstanceDto;
  responses: QuestionnaireSubmittedResponseDto[];
}
