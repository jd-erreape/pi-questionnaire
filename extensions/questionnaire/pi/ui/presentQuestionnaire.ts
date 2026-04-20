import type { ExtensionContext } from "@mariozechner/pi-coding-agent";

import { QuestionnaireViewModel } from "../../presentation/QuestionnaireViewModel.js";
import { CustomQuestionnairePresenter } from "./CustomQuestionnairePresenter.js";
import { DialogQuestionnairePresenter } from "./DialogQuestionnairePresenter.js";
import type { QuestionnaireUiOutcome } from "./questionnaire-ui.js";

const customPresenter = new CustomQuestionnairePresenter();
const dialogPresenter = new DialogQuestionnairePresenter();

export async function presentQuestionnaire(
  ctx: ExtensionContext,
  viewModel: QuestionnaireViewModel,
): Promise<QuestionnaireUiOutcome> {
  try {
    // We leverage the fact that over RPC ctx.ui.custom will be undefined
    // so we'll fallback to RPC compatible presentation, we may want to do
    // the check more explicit if this gets confusing
    const customOutcome = await customPresenter.present(ctx, viewModel);
    if (customOutcome !== undefined) {
      return customOutcome;
    }

    const dialogOutcome = await dialogPresenter.present(ctx, viewModel);
    if (dialogOutcome !== undefined) {
      return dialogOutcome;
    }

    throw new Error("Questionnaire UI is unavailable.");
  } finally {
    viewModel.dispose();
  }
}
