import { Result, type Result as ResultType } from "../../result.js";
import { QuestionnaireNotActiveError } from "../errors.js";
import { toQuestionnaireInstanceDto } from "../mappers/questionnaire-instance.js";
import type { QuestionnaireInstanceDto } from "../dto/questionnaire-instance.js";
import type { ActiveQuestionnaireStore } from "../ports.js";

export interface CancelQuestionnaireCommand {
  sessionID: string;
  requestID: string;
}

export interface CancelQuestionnaireDependencies {
  activeQuestionnaireStore: ActiveQuestionnaireStore;
}

export type CancelQuestionnaireResult = ResultType<
  QuestionnaireInstanceDto,
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

  return Result.ok(toQuestionnaireInstanceDto(questionnaire));
}
