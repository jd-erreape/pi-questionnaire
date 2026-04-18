import type { ActiveQuestionnaireStore } from "../ports.js";

export interface DisposeQuestionnaireCommand {
  sessionID: string;
  requestID: string;
}

export interface DisposeQuestionnaireDependencies {
  activeQuestionnaireStore: ActiveQuestionnaireStore;
}

export function disposeQuestionnaire(
  command: DisposeQuestionnaireCommand,
  dependencies: DisposeQuestionnaireDependencies,
): void {
  const questionnaire = dependencies.activeQuestionnaireStore.get(
    command.sessionID,
  );

  if (!questionnaire || questionnaire.getRequestID() !== command.requestID) {
    return;
  }

  dependencies.activeQuestionnaireStore.delete(command.sessionID);
}
