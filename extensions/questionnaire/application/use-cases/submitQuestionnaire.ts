import type { QuestionnaireAnswerDto } from "../../contract/result.js";
import { Result, type Result as ResultType } from "../../result.js";
import {
  InvalidQuestionnaireAnswersError,
  QuestionnaireNotActiveError,
} from "../errors.js";
import { toQuestionnaireInstanceDto } from "../mappers/questionnaire-instance.js";
import type { ActiveQuestionnaireStore } from "../ports.js";

export interface SubmitQuestionnaireCommand {
  sessionID: string;
  requestID: string;
}

export interface SubmitQuestionnaireDependencies {
  activeQuestionnaireStore: ActiveQuestionnaireStore;
}

export type SubmitQuestionnaireResult = ResultType<
  {
    instance: ReturnType<typeof toQuestionnaireInstanceDto>;
    answers: QuestionnaireAnswerDto[];
  },
  InvalidQuestionnaireAnswersError | QuestionnaireNotActiveError
>;

export function submitQuestionnaire(
  command: SubmitQuestionnaireCommand,
  dependencies: SubmitQuestionnaireDependencies,
): SubmitQuestionnaireResult {
  const questionnaire = dependencies.activeQuestionnaireStore.get(
    command.sessionID,
  );

  if (!questionnaire || questionnaire.getRequestID() !== command.requestID) {
    return Result.error(new QuestionnaireNotActiveError());
  }

  const submissionResult = questionnaire.submit();

  if (!submissionResult.ok) {
    return Result.error(
      new InvalidQuestionnaireAnswersError(submissionResult.error.issues),
    );
  }

  dependencies.activeQuestionnaireStore.delete(command.sessionID);

  return Result.ok({
    instance: toQuestionnaireInstanceDto(questionnaire),
    answers: submissionResult.value.map((answer) => ({
      selections: [...answer.selections],
      custom: answer.custom,
    })),
  });
}
