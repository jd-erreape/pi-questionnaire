import type { ExtensionContext } from "@mariozechner/pi-coding-agent";

import { QuestionnaireComponent } from "./QuestionnaireComponent.js";
import type {
  QuestionnairePresenter,
  QuestionnaireUiOutcome,
} from "./questionnaire-ui.js";
import { QuestionnaireViewModel } from "../../presentation/QuestionnaireViewModel.js";

export class CustomQuestionnairePresenter implements QuestionnairePresenter {
  async present(
    ctx: ExtensionContext,
    viewModel: QuestionnaireViewModel,
  ): Promise<QuestionnaireUiOutcome | undefined> {
    if (typeof ctx.ui.custom !== "function") {
      return undefined;
    }

    const outcome = await ctx.ui.custom<QuestionnaireUiOutcome>(
      (tui, theme, _keybindings, done) =>
        new QuestionnaireComponent({
          tui,
          theme,
          viewModel,
          done,
        }),
    );

    return outcome ?? undefined;
  }
}
