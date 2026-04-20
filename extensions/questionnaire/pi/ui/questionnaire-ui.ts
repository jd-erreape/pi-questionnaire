import type { ExtensionContext } from "@mariozechner/pi-coding-agent";

import type { QuestionnaireDto } from "../../application/dto/questionnaire.js";
import type { SubmittedQuestionnaireDto } from "../../application/dto/questionnaire-submission.js";
import { QuestionnaireViewModel } from "../../presentation/QuestionnaireViewModel.js";

export type QuestionnaireUiOutcome =
  | {
      kind: "submitted";
      result: SubmittedQuestionnaireDto;
    }
  | {
      kind: "cancelled";
      result: QuestionnaireDto;
    };

export type QuestionnaireComponentDone = (
  outcome: QuestionnaireUiOutcome,
) => void;

export interface QuestionnairePresenter {
  present(
    ctx: ExtensionContext,
    viewModel: QuestionnaireViewModel,
  ): Promise<QuestionnaireUiOutcome | undefined>;
}
