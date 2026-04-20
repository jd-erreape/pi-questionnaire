import type { Theme } from "@mariozechner/pi-coding-agent";
import {
  Key,
  matchesKey,
  truncateToWidth,
  type Component,
} from "@mariozechner/pi-tui";

import { dispatchQuestionnaireIntent } from "../../presentation/QuestionnaireIntent.js";
import { QuestionnaireViewModel } from "../../presentation/QuestionnaireViewModel.js";
import type { QuestionnaireComponentDone } from "./questionnaire-ui.js";

interface RenderTui {
  requestRender(): void;
}

interface QuestionnaireComponentOptions {
  tui: RenderTui;
  theme: Theme;
  viewModel: QuestionnaireViewModel;
  done: QuestionnaireComponentDone;
}

export class QuestionnaireComponent implements Component {
  private optionIndex = 0;
  private mode: "browse" | "edit_custom" = "browse";
  private customAnswerBuffer = "";
  private cachedWidth: number | undefined;
  private cachedLines: string[] | undefined;

  constructor(private readonly options: QuestionnaireComponentOptions) {}

  render(width: number): string[] {
    if (this.cachedLines && this.cachedWidth === width) {
      return this.cachedLines;
    }

    const lines: string[] = [];
    const { theme, viewModel } = this.options;
    const currentQuestion = viewModel.currentQuestion();
    const progress = viewModel.progress();
    const questions = viewModel.questions();
    const border = theme.fg("border", "─".repeat(Math.max(0, width)));

    const add = (line = "") => {
      lines.push(truncateToWidth(line, width));
    };

    add(border);

    const title = viewModel.title() ?? "Questionnaire";
    add(theme.fg("accent", theme.bold(` ${title}`)));

    if (viewModel.instructions()) {
      add(theme.fg("muted", ` ${viewModel.instructions()}`));
    }

    add(
      theme.fg(
        "dim",
        ` Question ${progress.currentQuestionNumber()} of ${progress.totalQuestions()}`,
      ),
    );
    add(this.renderQuestionTabs(width, questions));
    add("");
    add(theme.fg("accent", ` ${currentQuestion.header()}`));
    add(theme.fg("text", ` ${currentQuestion.question()}`));

    if (!currentQuestion.isRequired()) {
      add(theme.fg("dim", " Optional question"));
    }

    add("");

    currentQuestion.options().forEach((option, index) => {
      const selected = option.isSelected();
      const highlighted = this.optionIndex === index;
      const marker = currentQuestion.allowsMultiple()
        ? selected
          ? "[x]"
          : "[ ]"
        : selected
          ? "(●)"
          : "(○)";
      const prefix = highlighted ? theme.fg("accent", "▸") : " ";
      const label = selected
        ? theme.fg("accent", option.label())
        : theme.fg("text", option.label());

      add(`${prefix} ${marker} ${label}`);

      if (option.description()) {
        add(`    ${theme.fg("muted", option.description() ?? "")}`);
      }
    });

    if (currentQuestion.allowsCustom()) {
      const customRowIndex = currentQuestion.options().length;
      const highlighted = this.optionIndex === customRowIndex;
      const prefix = highlighted ? theme.fg("accent", "▸") : " ";
      const customAnswer = currentQuestion.customAnswer();
      const label =
        customAnswer && customAnswer.length > 0
          ? `Custom: ${customAnswer}`
          : "Custom answer…";

      add(
        `${prefix} ${customAnswer ? theme.fg("accent", "(●)") : "(○)"} ${theme.fg(
          customAnswer ? "accent" : "text",
          label,
        )}`,
      );
    }

    if (this.mode === "edit_custom") {
      add("");
      add(theme.fg("muted", " Edit custom answer"));
      add(
        theme.fg(
          "text",
          ` ${this.customAnswerBuffer.length > 0 ? this.customAnswerBuffer : ""}█`,
        ),
      );
      add(theme.fg("dim", " Enter save • Backspace delete • Esc cancel"));
    }

    if (currentQuestion.problem()) {
      add("");
      add(theme.fg("warning", ` Problem: ${currentQuestion.problem()}`));
    }

    add("");
    add(
      theme.fg(
        "dim",
        " ↑↓ browse • Enter select • Tab/→ next • Shift+Tab/← previous",
      ),
    );
    add(theme.fg("dim", " 1-5 jump • Submit [s] • Clear [x] • Cancel [Esc]"));
    add(border);

    this.cachedWidth = width;
    this.cachedLines = lines;
    return lines;
  }

  handleInput(data: string): void {
    if (this.mode === "edit_custom") {
      this.handleCustomAnswerInput(data);
      return;
    }

    if (this.handleQuestionJump(data)) {
      return;
    }

    if (
      matchesKey(data, Key.tab) ||
      matchesKey(data, Key.right) ||
      data === Key.right
    ) {
      dispatchQuestionnaireIntent(this.options.viewModel, { type: "next" });
      this.syncOptionIndex();
      this.refresh();
      return;
    }

    if (
      matchesKey(data, Key.shift("tab")) ||
      matchesKey(data, Key.left) ||
      data === Key.left
    ) {
      dispatchQuestionnaireIntent(this.options.viewModel, { type: "previous" });
      this.syncOptionIndex();
      this.refresh();
      return;
    }

    if (matchesKey(data, Key.up)) {
      this.optionIndex = Math.max(0, this.optionIndex - 1);
      this.refresh();
      return;
    }

    if (matchesKey(data, Key.down)) {
      this.optionIndex = Math.min(this.optionCount() - 1, this.optionIndex + 1);
      this.refresh();
      return;
    }

    if (matchesKey(data, Key.escape)) {
      const result = dispatchQuestionnaireIntent(this.options.viewModel, {
        type: "cancel",
      }) as ReturnType<QuestionnaireViewModel["cancel"]>;

      if (result?.ok) {
        this.options.done({ kind: "cancelled", result: result.value });
      }
      return;
    }

    if (data === "s" || data === "S") {
      const result = dispatchQuestionnaireIntent(this.options.viewModel, {
        type: "submit",
      }) as ReturnType<QuestionnaireViewModel["submit"]>;

      if (result?.ok) {
        this.options.done({ kind: "submitted", result: result.value });
        return;
      }

      this.refresh();
      return;
    }

    if (data === "x" || data === "X" || matchesKey(data, Key.delete)) {
      dispatchQuestionnaireIntent(this.options.viewModel, {
        type: "clear_answer",
      });
      this.refresh();
      return;
    }

    if (matchesKey(data, Key.space)) {
      this.activateFocusedRow();
      return;
    }

    if (matchesKey(data, Key.enter) || matchesKey(data, Key.return)) {
      this.activateFocusedRow();
    }
  }

  invalidate(): void {
    this.cachedWidth = undefined;
    this.cachedLines = undefined;
  }

  private handleQuestionJump(data: string): boolean {
    if (!/^[1-5]$/.test(data)) {
      return false;
    }

    const questionIndex = Number.parseInt(data, 10) - 1;

    dispatchQuestionnaireIntent(this.options.viewModel, {
      type: "go_to_question",
      questionIndex,
    });
    this.syncOptionIndex();
    this.refresh();
    return true;
  }

  private activateFocusedRow(): void {
    const currentQuestion = this.options.viewModel.currentQuestion();
    const focusedOption = currentQuestion.options()[this.optionIndex];

    if (focusedOption) {
      dispatchQuestionnaireIntent(this.options.viewModel, {
        type: currentQuestion.allowsMultiple()
          ? "toggle_option"
          : "select_option",
        label: focusedOption.label(),
      });
      this.refresh();
      return;
    }

    if (currentQuestion.allowsCustom()) {
      this.mode = "edit_custom";
      this.customAnswerBuffer = currentQuestion.customAnswer() ?? "";
      this.refresh();
    }
  }

  private handleCustomAnswerInput(data: string): void {
    if (matchesKey(data, Key.escape)) {
      this.mode = "browse";
      this.customAnswerBuffer = "";
      this.refresh();
      return;
    }

    if (matchesKey(data, Key.backspace)) {
      this.customAnswerBuffer = this.customAnswerBuffer.slice(0, -1);
      this.refresh();
      return;
    }

    if (matchesKey(data, Key.enter) || matchesKey(data, Key.return)) {
      const value = this.customAnswerBuffer.trim();

      this.mode = "browse";
      this.customAnswerBuffer = "";

      if (value.length > 0) {
        dispatchQuestionnaireIntent(this.options.viewModel, {
          type: "set_custom_answer",
          value,
        });
      }

      this.refresh();
      return;
    }

    if (isPrintableCharacter(data)) {
      this.customAnswerBuffer += data;
      this.refresh();
    }
  }

  private optionCount(): number {
    const currentQuestion = this.options.viewModel.currentQuestion();

    return (
      currentQuestion.options().length +
      (currentQuestion.allowsCustom() ? 1 : 0)
    );
  }

  private syncOptionIndex(): void {
    this.optionIndex = Math.min(this.optionIndex, this.optionCount() - 1);
  }

  private renderQuestionTabs(
    width: number,
    questions: ReturnType<QuestionnaireViewModel["questions"]>,
  ): string {
    const tabs = questions.map((question) => {
      const selected =
        question.index() === this.options.viewModel.currentQuestionIndex();
      const prefix = selected ? "▸" : " ";
      const answered = question.isAnswered() ? "✓" : "·";
      const problem = question.problem() ? "!" : "";
      return `${prefix}Q${question.index() + 1}${answered}${problem}`;
    });

    return truncateToWidth(
      this.options.theme.fg("muted", ` ${tabs.join("  ")}`),
      width,
    );
  }

  private refresh(): void {
    this.invalidate();
    this.options.tui.requestRender();
  }
}

function isPrintableCharacter(data: string): boolean {
  return data.length === 1 && data >= " " && data !== "\x7f";
}
