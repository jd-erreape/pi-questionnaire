import { Result, type Result as ResultType } from "../../result.js";
import type { QuestionnaireDraftAnswerMutationDto } from "../dto/questionnaire-draft-answers.js";
import type { QuestionnaireDto } from "../dto/questionnaire.js";
import { QuestionnaireNotActiveError } from "../errors.js";
import { toQuestionnaireDto } from "../mappers/questionnaire.js";
import type { ActiveQuestionnaireStore } from "../ports.js";

export interface UpdateQuestionnaireAnswerCommand {
  sessionID: string;
  requestID: string;
  mutation: QuestionnaireDraftAnswerMutationDto;
}

export interface UpdateQuestionnaireAnswerDependencies {
  activeQuestionnaireStore: ActiveQuestionnaireStore;
}

export type UpdateQuestionnaireAnswerResult = ResultType<
  QuestionnaireDto,
  QuestionnaireNotActiveError
>;

export function updateQuestionnaireAnswer(
  command: UpdateQuestionnaireAnswerCommand,
  dependencies: UpdateQuestionnaireAnswerDependencies,
): UpdateQuestionnaireAnswerResult {
  const questionnaire = dependencies.activeQuestionnaireStore.get(
    command.sessionID,
  );

  if (!questionnaire || questionnaire.getRequestID() !== command.requestID) {
    return Result.error(new QuestionnaireNotActiveError());
  }

  switch (command.mutation.type) {
    case "select_option":
      questionnaire.selectOption(
        command.mutation.questionIndex,
        command.mutation.label,
      );
      break;
    case "toggle_option":
      questionnaire.toggleOption(
        command.mutation.questionIndex,
        command.mutation.label,
      );
      break;
    case "set_custom_answer":
      questionnaire.setCustomAnswer(
        command.mutation.questionIndex,
        command.mutation.value,
      );
      break;
    case "clear_answer":
      questionnaire.clearAnswer(command.mutation.questionIndex);
      break;
  }

  dependencies.activeQuestionnaireStore.save(questionnaire);

  return Result.ok(toQuestionnaireDto(questionnaire));
}
