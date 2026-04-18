import type { AnswerSlot } from "./answer.js";
import type { QuestionnaireInstance } from "./instance.js";

export interface QuestionnaireSubmittedOutcome {
  kind: "submitted";
  instance: QuestionnaireInstance;
  answers: AnswerSlot[];
}

export interface QuestionnaireCancelledOutcome {
  kind: "cancelled";
  instance: QuestionnaireInstance;
}

export type QuestionnaireOutcome =
  | QuestionnaireSubmittedOutcome
  | QuestionnaireCancelledOutcome;
