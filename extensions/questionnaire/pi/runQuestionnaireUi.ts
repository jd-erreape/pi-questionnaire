import type { ExtensionContext } from "@mariozechner/pi-coding-agent";

import {
  QuestionnaireComponent,
  type QuestionnaireUiOutcome,
} from "./QuestionnaireComponent.js";
import { QuestionnaireViewModel } from "../presentation/QuestionnaireViewModel.js";

export async function runQuestionnaireUi(
  ctx: ExtensionContext,
  viewModel: QuestionnaireViewModel,
): Promise<QuestionnaireUiOutcome> {
  try {
    return await ctx.ui.custom<QuestionnaireUiOutcome>(
      (tui, theme, _keybindings, done) =>
        new QuestionnaireComponent({
          tui,
          theme,
          viewModel,
          done,
        }),
    );
  } finally {
    viewModel.dispose();
  }
}
