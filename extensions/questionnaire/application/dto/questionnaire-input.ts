import type { QuestionnaireOptionDto } from "./questionnaire-definition.js";

export interface QuestionnaireInputQuestionDto {
  header: string;
  question: string;
  options: QuestionnaireOptionDto[];
  multiSelect?: boolean;
  allowCustom?: boolean;
  required?: boolean;
}

export interface QuestionnaireInputDto {
  title?: string;
  instructions?: string;
  questions: QuestionnaireInputQuestionDto[];
}
