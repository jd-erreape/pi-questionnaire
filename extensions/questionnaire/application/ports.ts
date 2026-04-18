import type { Questionnaire } from "../domain/questionnaire.js";

export interface IdGenerator {
  nextRequestID(): string;
}

export interface ActiveQuestionnaireStore {
  get(sessionID: string): Questionnaire | undefined;
  save(questionnaire: Questionnaire): void;
  delete(sessionID: string): void;
}
