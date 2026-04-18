import { Result, type Result as ResultType } from "../../result.js";
import type { QuestionnaireDto } from "../dto/questionnaire.js";
import { QuestionnaireNotActiveError } from "../errors.js";
import { toQuestionnaireDto } from "../mappers/questionnaire.js";
import type { ActiveQuestionnaireStore } from "../ports.js";

export interface CancelQuestionnaireCommand {
  sessionID: string;
  requestID: string;
}

export interface CancelQuestionnaireDependencies {
  activeQuestionnaireStore: ActiveQuestionnaireStore;
}

export type CancelQuestionnaireResult = ResultType<
  QuestionnaireDto,
  QuestionnaireNotActiveError
>;

export function cancelQuestionnaire(
  command: CancelQuestionnaireCommand,
  dependencies: CancelQuestionnaireDependencies,
): CancelQuestionnaireResult {
  const questionnaire = dependencies.activeQuestionnaireStore.get(
    command.sessionID,
  );

  if (!questionnaire || questionnaire.getRequestID() !== command.requestID) {
    return Result.error(new QuestionnaireNotActiveError());
  }

  dependencies.activeQuestionnaireStore.delete(command.sessionID);

  return Result.ok(toQuestionnaireDto(questionnaire));
}
