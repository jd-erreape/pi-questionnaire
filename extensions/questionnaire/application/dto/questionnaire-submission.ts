import type { QuestionnaireDto } from "./questionnaire.js";

export interface QuestionnaireSubmittedResponseDto {
  question: string;
  selections: string[];
}

export interface SubmittedQuestionnaireDto {
  questionnaire: QuestionnaireDto;
  responses: QuestionnaireSubmittedResponseDto[];
}
