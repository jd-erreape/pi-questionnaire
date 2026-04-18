import { QuestionnaireError } from "../errors.js";
import type {
  QuestionnaireRequestProblemDto,
  QuestionnaireSubmissionProblemDto,
} from "./dto/questionnaire-problems.js";

export class InvalidQuestionnaireRequestError extends QuestionnaireError {
  readonly kind = "invalid_request";

  constructor(readonly problems: QuestionnaireRequestProblemDto[]) {
    super("Invalid questionnaire request.");
  }
}

export class InteractiveUIRequiredError extends QuestionnaireError {
  readonly kind = "interactive_ui_required";

  constructor() {
    super("questionnaire requires interactive UI support.");
  }
}

export class QuestionnaireAlreadyActiveError extends QuestionnaireError {
  readonly kind = "questionnaire_already_active";

  constructor() {
    super("Another questionnaire is already active for this session.");
  }
}

export class QuestionnaireNotActiveError extends QuestionnaireError {
  readonly kind = "questionnaire_not_active";

  constructor() {
    super("Questionnaire is not active.");
  }
}

export class InvalidQuestionnaireAnswersError extends QuestionnaireError {
  readonly kind = "invalid_answers";

  constructor(readonly problems: QuestionnaireSubmissionProblemDto[]) {
    super("Invalid questionnaire answers.");
  }
}
