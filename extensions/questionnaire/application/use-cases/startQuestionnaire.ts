import { normalizeQuestionnaireRequest } from "../../domain/policies/normalizeQuestionnaireRequest.js";
import { validateQuestionnaireRequest } from "../../domain/policies/validateQuestionnaireRequest.js";
import { Questionnaire } from "../../domain/questionnaire.js";
import { Result, type Result as ResultType } from "../../result.js";
import type { QuestionnaireInstanceDto } from "../dto/questionnaire-instance.js";
import {
  InteractiveUIRequiredError,
  InvalidQuestionnaireRequestError,
  QuestionnaireAlreadyActiveError,
} from "../errors.js";
import { toQuestionnaireInstanceDto } from "../mappers/questionnaire-instance.js";
import type { ActiveQuestionnaireStore, IdGenerator } from "../ports.js";

export interface StartQuestionnaireCommand {
  input: unknown;
  sessionID: string;
  hasInteractiveUI: boolean;
}

export interface StartQuestionnaireDependencies {
  activeQuestionnaireStore: ActiveQuestionnaireStore;
  idGenerator: IdGenerator;
}

export type StartQuestionnaireError =
  | InvalidQuestionnaireRequestError
  | InteractiveUIRequiredError
  | QuestionnaireAlreadyActiveError;

export type StartQuestionnaireResult = ResultType<
  QuestionnaireInstanceDto,
  StartQuestionnaireError
>;

export function startQuestionnaire(
  command: StartQuestionnaireCommand,
  dependencies: StartQuestionnaireDependencies,
): StartQuestionnaireResult {
  const validationResult = validateQuestionnaireRequest(command.input);

  if (!validationResult.ok) {
    return Result.error(
      new InvalidQuestionnaireRequestError(validationResult.error.issues),
    );
  }

  if (!command.hasInteractiveUI) {
    return Result.error(new InteractiveUIRequiredError());
  }

  const existingQuestionnaire = dependencies.activeQuestionnaireStore.get(
    command.sessionID,
  );

  if (existingQuestionnaire) {
    return Result.error(new QuestionnaireAlreadyActiveError());
  }

  const questionnaire = Questionnaire.start(
    {
      requestID: dependencies.idGenerator.nextRequestID(),
      sessionID: command.sessionID,
    },
    normalizeQuestionnaireRequest(validationResult.value),
  );

  dependencies.activeQuestionnaireStore.save(questionnaire);

  return Result.ok(toQuestionnaireInstanceDto(questionnaire));
}
