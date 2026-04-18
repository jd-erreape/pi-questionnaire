import type { ActiveQuestionnaireStore } from "../../application/ports.js";
import type { QuestionnaireInstance } from "../../domain/instance.js";

export class InMemoryActiveQuestionnaireStore implements ActiveQuestionnaireStore {
  private readonly instances = new Map<string, QuestionnaireInstance>();

  get(sessionID: string): QuestionnaireInstance | undefined {
    return this.instances.get(sessionID);
  }

  save(instance: QuestionnaireInstance): void {
    this.instances.set(instance.metadata.sessionID, instance);
  }

  delete(sessionID: string): void {
    this.instances.delete(sessionID);
  }
}
