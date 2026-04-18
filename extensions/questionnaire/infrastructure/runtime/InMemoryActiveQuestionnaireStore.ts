import type { ActiveQuestionnaireStore } from "../../application/ports.js";
import type { Questionnaire } from "../../domain/questionnaire.js";

export class InMemoryActiveQuestionnaireStore implements ActiveQuestionnaireStore {
  private readonly questionnaires = new Map<string, Questionnaire>();

  get(sessionID: string): Questionnaire | undefined {
    return this.questionnaires.get(sessionID);
  }

  save(questionnaire: Questionnaire): void {
    this.questionnaires.set(questionnaire.getSessionID(), questionnaire);
  }

  delete(sessionID: string): void {
    this.questionnaires.delete(sessionID);
  }
}
