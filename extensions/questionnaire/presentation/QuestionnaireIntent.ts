import type {
  CancelQuestionnaireResult,
  SubmitQuestionnaireResult,
} from "./QuestionnaireViewModel.js";
import { QuestionnaireViewModel } from "./QuestionnaireViewModel.js";

export type QuestionnaireIntent =
  | { type: "next" }
  | { type: "previous" }
  | { type: "go_to_question"; questionIndex: number }
  | { type: "select_option"; label: string }
  | { type: "toggle_option"; label: string }
  | { type: "set_custom_answer"; value: string }
  | { type: "clear_answer" }
  | { type: "submit" }
  | { type: "cancel" };

export function dispatchQuestionnaireIntent(
  viewModel: QuestionnaireViewModel,
  intent: QuestionnaireIntent,
): SubmitQuestionnaireResult | CancelQuestionnaireResult | void {
  switch (intent.type) {
    case "next":
      viewModel.nextQuestion();
      return;
    case "previous":
      viewModel.previousQuestion();
      return;
    case "go_to_question":
      viewModel.goToQuestion(intent.questionIndex);
      return;
    case "select_option":
      viewModel.selectOption(intent.label);
      return;
    case "toggle_option":
      viewModel.toggleOption(intent.label);
      return;
    case "set_custom_answer":
      viewModel.setCustomAnswer(intent.value);
      return;
    case "clear_answer":
      viewModel.clearAnswer();
      return;
    case "submit":
      return viewModel.submit();
    case "cancel":
      return viewModel.cancel();
  }
}
