export interface QuestionnaireRequestProblemDto {
  message: string;
  path?: string;
}

export interface QuestionnaireSubmissionProblemDto {
  message: string;
  questionIndex?: number;
}
