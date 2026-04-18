import { normalizeQuestionnaireRequest } from "../../domain/policies/normalizeQuestionnaireRequest.js";
import { validateQuestionnaireRequest } from "../../domain/policies/validateQuestionnaireRequest.js";
import { Questionnaire } from "../../domain/questionnaire.js";
import { Result, type Result as ResultType } from "../../result.js";
import type { QuestionnaireDto } from "../dto/questionnaire.js";
import {
  InteractiveUIRequiredError,
  InvalidQuestionnaireRequestError,
  QuestionnaireAlreadyActiveError,
} from "../errors.js";
import { toQuestionnaireDto } from "../mappers/questionnaire.js";
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
  QuestionnaireDto,
  StartQuestionnaireError
>;

export function startQuestionnaire(
  command: StartQuestionnaireCommand,
  dependencies: StartQuestionnaireDependencies,
): StartQuestionnaireResult {
  const validationResult = validateQuestionnaireRequest(command.input);

  if (!validationResult.ok) {
    return Result.error(
      new InvalidQuestionnaireRequestError(validationResult.error.problems),
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

  return Result.ok(toQuestionnaireDto(questionnaire));
}
