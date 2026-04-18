import { QuestionnaireError } from "../errors.js";

export interface ValidationIssue {
  message: string;
  path?: string;
}

export class QuestionnaireValidationError extends QuestionnaireError {
  constructor(readonly issues: ValidationIssue[]) {
    super("Invalid questionnaire request.");
  }
}

export interface QuestionnaireSubmissionIssue {
  message: string;
  questionIndex?: number;
}

export class QuestionnaireSubmissionError extends QuestionnaireError {
  constructor(readonly issues: QuestionnaireSubmissionIssue[]) {
    super("Invalid questionnaire answers.");
  }
}
