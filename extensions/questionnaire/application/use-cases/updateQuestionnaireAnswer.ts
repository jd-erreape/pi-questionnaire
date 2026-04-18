import { Result, type Result as ResultType } from "../../result.js";
import type {
  QuestionnaireDraftAnswerMutationDto,
  QuestionnaireDraftAnswersDto,
} from "../dto/questionnaire-draft-answers.js";
import { QuestionnaireNotActiveError } from "../errors.js";
import { toQuestionnaireDraftAnswersDto } from "../mappers/questionnaire-draft-answers.js";
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
  QuestionnaireDraftAnswersDto,
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

  return Result.ok(
    toQuestionnaireDraftAnswersDto(questionnaire.toAnswerState()),
  );
}
