import type { ExtensionContext } from "@mariozechner/pi-coding-agent";

import type { QuestionnaireInputDto } from "../../application/dto/questionnaire-input.js";
import type { QuestionnaireDetailsDto } from "../../application/dto/questionnaire-result.js";
import { cancelQuestionnaire } from "../../application/use-cases/cancelQuestionnaire.js";
import { disposeQuestionnaire } from "../../application/use-cases/disposeQuestionnaire.js";
import { startQuestionnaire } from "../../application/use-cases/startQuestionnaire.js";
import { submitQuestionnaire } from "../../application/use-cases/submitQuestionnaire.js";
import { updateQuestionnaireAnswer } from "../../application/use-cases/updateQuestionnaireAnswer.js";
import { InMemoryActiveQuestionnaireStore } from "../../infrastructure/runtime/InMemoryActiveQuestionnaireStore.js";
import { RandomIdGenerator } from "../../infrastructure/runtime/RandomIdGenerator.js";
import { QuestionnaireViewModel } from "../../presentation/QuestionnaireViewModel.js";
import {
  mapCancelledOutcome,
  mapStartFailure,
  mapSubmittedOutcome,
  type QuestionnaireToolResult,
} from "./mapQuestionnaireToolResult.js";
import { presentQuestionnaire } from "../ui/presentQuestionnaire.js";

const activeQuestionnaireStore = new InMemoryActiveQuestionnaireStore();
const idGenerator = new RandomIdGenerator();

export async function executeQuestionnaireTool(
  params: QuestionnaireInputDto,
  ctx: ExtensionContext,
): Promise<QuestionnaireToolResult<QuestionnaireDetailsDto>> {
  const startResult = startQuestionnaire(
    {
      input: params,
      sessionID: getSessionID(ctx),
      hasInteractiveUI: ctx.hasUI,
    },
    {
      activeQuestionnaireStore,
      idGenerator,
    },
  );

  if (!startResult.ok) {
    return mapStartFailure(startResult.error);
  }

  const viewModel = new QuestionnaireViewModel(
    startResult.value,
    (command) =>
      updateQuestionnaireAnswer(command, { activeQuestionnaireStore }),
    (command) => submitQuestionnaire(command, { activeQuestionnaireStore }),
    (command) => cancelQuestionnaire(command, { activeQuestionnaireStore }),
    (command) => disposeQuestionnaire(command, { activeQuestionnaireStore }),
  );

  const outcome = await presentQuestionnaire(ctx, viewModel);

  return outcome.kind === "submitted"
    ? mapSubmittedOutcome(outcome.result)
    : mapCancelledOutcome(outcome.result);
}

function getSessionID(ctx: ExtensionContext): string {
  return ctx.sessionManager.getSessionFile() ?? `ephemeral:${ctx.cwd}`;
}
