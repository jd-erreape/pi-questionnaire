import type { ActiveQuestionnaireStore, IdGenerator } from "../ports.js";
import { prepareQuestionnaireRequest } from "./prepareQuestionnaireRequest.js";
import type { QuestionnaireInstance } from "../../domain/instance.js";
import type { ValidationIssue } from "../../domain/validation.js";

export interface StartQuestionnaireCommand {
  input: unknown;
  sessionID: string;
  hasInteractiveUI: boolean;
}

export interface StartQuestionnaireDependencies {
  activeQuestionnaireStore: ActiveQuestionnaireStore;
  idGenerator: IdGenerator;
}

export type StartQuestionnaireFailure =
  | {
      kind: "invalid_request";
      issues: ValidationIssue[];
    }
  | {
      kind: "interactive_ui_required";
    }
  | {
      kind: "questionnaire_already_active";
    };

export type StartQuestionnaireResult =
  | {
      ok: true;
      value: QuestionnaireInstance;
    }
  | {
      ok: false;
      failure: StartQuestionnaireFailure;
    };

export function startQuestionnaire(
  command: StartQuestionnaireCommand,
  dependencies: StartQuestionnaireDependencies,
): StartQuestionnaireResult {
  const prepared = prepareQuestionnaireRequest(command.input);

  if (!prepared.ok) {
    return {
      ok: false,
      failure: {
        kind: "invalid_request",
        issues: prepared.issues,
      },
    };
  }

  if (!command.hasInteractiveUI) {
    return {
      ok: false,
      failure: {
        kind: "interactive_ui_required",
      },
    };
  }

  const existingInstance = dependencies.activeQuestionnaireStore.get(
    command.sessionID,
  );

  if (existingInstance) {
    return {
      ok: false,
      failure: {
        kind: "questionnaire_already_active",
      },
    };
  }

  const instance: QuestionnaireInstance = {
    metadata: {
      requestID: dependencies.idGenerator.nextRequestID(),
      sessionID: command.sessionID,
    },
    definition: prepared.value,
  };

  dependencies.activeQuestionnaireStore.save(instance);

  return {
    ok: true,
    value: instance,
  };
}
