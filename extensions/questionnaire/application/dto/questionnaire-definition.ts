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

export interface QuestionnaireDefinitionDto {
  title?: string;
  instructions?: string;
  questions: QuestionnaireQuestionDto[];
}
