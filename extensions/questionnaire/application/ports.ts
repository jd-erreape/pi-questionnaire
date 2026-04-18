import type { QuestionnaireInstance } from "../domain/instance.js";

export interface IdGenerator {
  nextRequestID(): string;
}

export interface ActiveQuestionnaireStore {
  get(sessionID: string): QuestionnaireInstance | undefined;
  save(instance: QuestionnaireInstance): void;
  delete(sessionID: string): void;
}
