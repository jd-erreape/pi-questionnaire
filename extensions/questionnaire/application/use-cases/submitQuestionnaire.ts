import { Result, type Result as ResultType } from "../../result.js";
import type { SubmittedQuestionnaireDto } from "../dto/questionnaire-submission.js";
import {
  InvalidQuestionnaireAnswersError,
  QuestionnaireNotActiveError,
} from "../errors.js";
import { toQuestionnaireDto } from "../mappers/questionnaire.js";
import type { ActiveQuestionnaireStore } from "../ports.js";

export interface SubmitQuestionnaireCommand {
  sessionID: string;
  requestID: string;
}

export interface SubmitQuestionnaireDependencies {
  activeQuestionnaireStore: ActiveQuestionnaireStore;
}

export type SubmitQuestionnaireResult = ResultType<
  SubmittedQuestionnaireDto,
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

  const questionnaireDto = toQuestionnaireDto(questionnaire);

  dependencies.activeQuestionnaireStore.delete(command.sessionID);

  return Result.ok({
    questionnaire: questionnaireDto,
    responses: submissionResult.value.map((answer, index) => ({
      question: questionnaireDto.questions[index]?.question ?? "",
      selections: [...answer.selections],
    })),
  });
}
