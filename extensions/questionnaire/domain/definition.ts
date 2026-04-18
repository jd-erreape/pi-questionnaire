export interface QuestionOptionDefinition {
  label: string;
  description?: string;
}

export interface QuestionDefinition {
  header: string;
  question: string;
  options: QuestionOptionDefinition[];
  multiSelect: boolean;
  allowCustom: boolean;
  required: boolean;
}

export interface QuestionnaireDefinition {
  title?: string;
  instructions?: string;
  questions: QuestionDefinition[];
}
