export interface QuestionnaireRequestIssueDto {
  message: string;
  path?: string;
}

export interface QuestionnaireSubmissionIssueDto {
  message: string;
  questionIndex?: number;
}
