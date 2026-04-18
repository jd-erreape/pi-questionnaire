import { QuestionnaireError } from "../errors.js";

export interface ValidationProblem {
  message: string;
  path?: string;
}

export class QuestionnaireValidationError extends QuestionnaireError {
  constructor(readonly problems: ValidationProblem[]) {
    super("Invalid questionnaire request.");
  }
}

export interface QuestionnaireSubmissionProblem {
  message: string;
  questionIndex?: number;
}

export class QuestionnaireSubmissionError extends QuestionnaireError {
  constructor(readonly problems: QuestionnaireSubmissionProblem[]) {
    super("Invalid questionnaire answers.");
  }
}
