import type { ExtensionContext } from "@mariozechner/pi-coding-agent";

import { QuestionnaireViewModel } from "../../presentation/QuestionnaireViewModel.js";
import type {
  QuestionnairePresenter,
  QuestionnaireUiOutcome,
} from "./questionnaire-ui.js";

interface QuestionAction {
  label: string;
  run():
    | QuestionnaireUiOutcome
    | undefined
    | Promise<QuestionnaireUiOutcome | undefined>;
}

export class DialogQuestionnairePresenter implements QuestionnairePresenter {
  async present(
    ctx: ExtensionContext,
    viewModel: QuestionnaireViewModel,
  ): Promise<QuestionnaireUiOutcome> {
    while (true) {
      const actions = buildQuestionActions(ctx, viewModel);
      const choice = await ctx.ui.select(
        buildQuestionTitle(viewModel),
        actions.map((action) => action.label),
      );

      if (choice === undefined) {
        const cancelledOutcome = await maybeCancelQuestionnaire(ctx, viewModel);
        if (cancelledOutcome) {
          return cancelledOutcome;
        }
        continue;
      }

      const action = actions.find((candidate) => candidate.label === choice);

      if (!action) {
        continue;
      }

      const outcome = await action.run();
      if (outcome) {
        return outcome;
      }
    }
  }
}

function buildQuestionTitle(viewModel: QuestionnaireViewModel): string {
  const progress = viewModel.progress();
  const currentQuestion = viewModel.currentQuestion();
  const questionSummaries = viewModel.questions();
  const currentAnswer = describeCurrentSelections(viewModel) ?? "none yet";
  const lines: string[] = [];

  if (viewModel.title()) {
    lines.push(`📝 ${viewModel.title()}`);
  }

  if (viewModel.instructions()) {
    lines.push(viewModel.instructions() ?? "");
  }

  lines.push("");
  lines.push(
    `━━ Question ${progress.currentQuestionNumber()} of ${progress.totalQuestions()} ━━`,
  );
  lines.push(
    `${currentQuestion.header()} · ${describeQuestionKind(viewModel)}`,
  );
  lines.push(currentQuestion.question());
  lines.push("");
  lines.push("Current answer");
  lines.push(`• ${currentAnswer}`);

  if (currentQuestion.problem()) {
    lines.push("");
    lines.push("⚠️ Problem");
    lines.push(`• ${currentQuestion.problem()}`);
  }

  lines.push("");
  lines.push("Questions");
  questionSummaries.forEach((question, index) => {
    lines.push(
      formatQuestionSummary(
        question.question(),
        index,
        index === viewModel.currentQuestionIndex(),
        question.problem() !== undefined,
        question.isAnswered(),
      ),
    );
  });

  lines.push("");
  lines.push("Choose an option or action below.");

  return lines.join("\n");
}

function buildQuestionActions(
  ctx: ExtensionContext,
  viewModel: QuestionnaireViewModel,
): QuestionAction[] {
  const currentQuestion = viewModel.currentQuestion();
  const actions: QuestionAction[] = currentQuestion.options().map((option) => ({
    label: `${option.isSelected() ? "☑️" : "◯"} Option: ${option.label()}`,
    run: () => {
      if (currentQuestion.allowsMultiple()) {
        viewModel.toggleOption(option.label());
      } else {
        viewModel.selectOption(option.label());
      }
      return undefined;
    },
  }));

  if (currentQuestion.allowsCustom()) {
    actions.push({
      label: currentQuestion.customAnswer()
        ? `✏️ Edit custom answer: ${currentQuestion.customAnswer()}`
        : "✏️ Add custom answer",
      run: async () => {
        const value = await ctx.ui.input(
          `${currentQuestion.header()}: enter a custom answer`,
          currentQuestion.customAnswer() ?? "",
        );

        if (value === undefined) {
          return undefined;
        }

        const trimmed = value.trim();
        if (trimmed.length > 0) {
          viewModel.setCustomAnswer(trimmed);
        }

        return undefined;
      },
    });
  }

  if (hasAnswer(viewModel)) {
    actions.push({
      label: "🧹 Clear answer",
      run: () => {
        viewModel.clearAnswer();
        return undefined;
      },
    });
  }

  if (viewModel.canGoPrevious()) {
    actions.push({
      label: "⬅️ Previous question",
      run: () => {
        viewModel.previousQuestion();
        return undefined;
      },
    });
  }

  if (viewModel.canGoNext()) {
    actions.push({
      label: "➡️ Next question",
      run: () => {
        viewModel.nextQuestion();
        return undefined;
      },
    });
  }

  actions.push({
    label: "✅ Submit questionnaire",
    run: () => {
      const result = viewModel.submit();
      if (result.ok) {
        return {
          kind: "submitted",
          result: result.value,
        };
      }

      focusFirstProblem(viewModel);
      ctx.ui.notify(
        "Please fix the questionnaire problems before submitting.",
        "warning",
      );
      return undefined;
    },
  });

  actions.push({
    label: "❌ Cancel questionnaire",
    run: async () => await maybeCancelQuestionnaire(ctx, viewModel),
  });

  return actions;
}

async function maybeCancelQuestionnaire(
  ctx: ExtensionContext,
  viewModel: QuestionnaireViewModel,
): Promise<QuestionnaireUiOutcome | undefined> {
  const confirmed = await ctx.ui.confirm(
    "Cancel questionnaire?",
    "Partial answers will be discarded.",
  );

  if (!confirmed) {
    return undefined;
  }

  const result = viewModel.cancel();

  if (!result.ok) {
    throw new Error(result.error.message);
  }

  return {
    kind: "cancelled",
    result: result.value,
  };
}

function describeQuestionKind(viewModel: QuestionnaireViewModel): string {
  const currentQuestion = viewModel.currentQuestion();
  const parts = [
    currentQuestion.allowsMultiple() ? "Multiple choice" : "Single choice",
    currentQuestion.isRequired() ? "required" : "optional",
  ];

  if (currentQuestion.allowsCustom()) {
    parts.push("custom allowed");
  }

  return parts.join(" · ");
}

function formatQuestionSummary(
  question: string,
  index: number,
  isCurrent: boolean,
  hasProblem: boolean,
  isAnswered: boolean,
): string {
  const marker = isCurrent ? "→" : hasProblem ? "!" : isAnswered ? "✓" : "•";
  const statusParts: string[] = [];

  if (isCurrent) {
    statusParts.push("current");
  }

  statusParts.push(
    hasProblem ? "needs attention" : isAnswered ? "answered" : "pending",
  );

  return `${marker} ${index + 1}. ${question} — ${statusParts.join(" · ")}`;
}

function focusFirstProblem(viewModel: QuestionnaireViewModel): void {
  const firstProblemIndex = viewModel
    .questions()
    .find((question) => question.problem() !== undefined)
    ?.index();

  if (firstProblemIndex !== undefined) {
    viewModel.goToQuestion(firstProblemIndex);
  }
}

function hasAnswer(viewModel: QuestionnaireViewModel): boolean {
  const currentQuestion = viewModel.currentQuestion();

  return (
    currentQuestion.customAnswer() !== undefined ||
    currentQuestion.options().some((option) => option.isSelected())
  );
}

function describeCurrentSelections(
  viewModel: QuestionnaireViewModel,
): string | undefined {
  const currentQuestion = viewModel.currentQuestion();
  const selections = currentQuestion
    .options()
    .filter((option) => option.isSelected())
    .map((option) => option.label());

  if (currentQuestion.customAnswer()) {
    selections.push(`custom: ${currentQuestion.customAnswer()}`);
  }

  if (selections.length === 0) {
    return undefined;
  }

  return selections.join(", ");
}
