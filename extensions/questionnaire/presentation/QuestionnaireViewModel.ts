import type {
  QuestionnaireDraftAnswersDto,
  QuestionnaireDraftSelectionDto,
} from "../application/dto/questionnaire-draft-answers.js";
import type { QuestionnaireSubmissionProblemDto } from "../application/dto/questionnaire-problems.js";
import type {
  QuestionnaireOptionDto,
  QuestionnaireQuestionDto,
} from "../application/dto/questionnaire-definition.js";
import type { QuestionnaireDto } from "../application/dto/questionnaire.js";
import {
  InvalidQuestionnaireAnswersError,
  QuestionnaireNotActiveError,
} from "../application/errors.js";
import type {
  CancelQuestionnaireCommand,
  CancelQuestionnaireResult,
} from "../application/use-cases/cancelQuestionnaire.js";
import type { DisposeQuestionnaireCommand } from "../application/use-cases/disposeQuestionnaire.js";
import type {
  SubmitQuestionnaireCommand,
  SubmitQuestionnaireResult,
} from "../application/use-cases/submitQuestionnaire.js";
import type {
  UpdateQuestionnaireAnswerCommand,
  UpdateQuestionnaireAnswerResult,
} from "../application/use-cases/updateQuestionnaireAnswer.js";

export type UpdateQuestionnaireAnswerFunction = (
  command: UpdateQuestionnaireAnswerCommand,
) => UpdateQuestionnaireAnswerResult;

export type SubmitQuestionnaireFunction = (
  command: SubmitQuestionnaireCommand,
) => SubmitQuestionnaireResult;

export type CancelQuestionnaireFunction = (
  command: CancelQuestionnaireCommand,
) => CancelQuestionnaireResult;

export type DisposeQuestionnaireFunction = (
  command: DisposeQuestionnaireCommand,
) => void;

export type { SubmitQuestionnaireResult, CancelQuestionnaireResult };

export class QuestionnaireViewModel {
  private currentQuestionIndexValue = 0;
  private submissionProblemsValue:
    | QuestionnaireSubmissionProblemDto[]
    | undefined;

  constructor(
    private questionnaire: QuestionnaireDto,
    private readonly updateQuestionnaireAnswer: UpdateQuestionnaireAnswerFunction,
    private readonly submitQuestionnaire: SubmitQuestionnaireFunction,
    private readonly cancelQuestionnaire: CancelQuestionnaireFunction,
    private readonly disposeQuestionnaire: DisposeQuestionnaireFunction,
  ) {
    if (this.questionnaire.questions.length === 0) {
      throw new Error("QuestionnaireDto must contain at least one question.");
    }
  }

  title(): string | undefined {
    return this.questionnaire.title;
  }

  instructions(): string | undefined {
    return this.questionnaire.instructions;
  }

  currentQuestionIndex(): number {
    return this.currentQuestionIndexValue;
  }

  canGoNext(): boolean {
    return (
      this.currentQuestionIndexValue < this.questionnaire.questions.length - 1
    );
  }

  canGoPrevious(): boolean {
    return this.currentQuestionIndexValue > 0;
  }

  progress(): QuestionnaireProgressViewModel {
    return new QuestionnaireProgressViewModel(
      this.currentQuestionIndexValue,
      this.questionnaire.questions.length,
    );
  }

  currentQuestion(): QuestionnaireCurrentQuestionViewModel {
    return new QuestionnaireCurrentQuestionViewModel(
      this.currentQuestionIndexValue,
      this.questionnaire.questions[this.currentQuestionIndexValue],
      this.questionnaire.draftAnswers[this.currentQuestionIndexValue]
        ?.selections ?? [],
      this.problemByQuestionIndex().get(this.currentQuestionIndexValue),
    );
  }

  questions(): QuestionnaireQuestionSummaryViewModel[] {
    const problemByQuestionIndex = this.problemByQuestionIndex();

    return this.questionnaire.questions.map(
      (question, index) =>
        new QuestionnaireQuestionSummaryViewModel(
          index,
          question.question,
          (this.questionnaire.draftAnswers[index]?.selections.length ?? 0) > 0,
          problemByQuestionIndex.get(index),
        ),
    );
  }

  draftAnswers(): QuestionnaireDraftAnswersDto {
    return cloneDraftAnswers(this.questionnaire.draftAnswers);
  }

  nextQuestion(): void {
    this.currentQuestionIndexValue = Math.min(
      this.currentQuestionIndexValue + 1,
      this.questionnaire.questions.length - 1,
    );
  }

  previousQuestion(): void {
    this.currentQuestionIndexValue = Math.max(
      this.currentQuestionIndexValue - 1,
      0,
    );
  }

  goToQuestion(questionIndex: number): void {
    this.currentQuestionIndexValue = clamp(
      questionIndex,
      0,
      this.questionnaire.questions.length - 1,
    );
  }

  selectOption(label: string): void {
    this.applyFocusedMutation({
      type: "select_option",
      label,
    });
  }

  toggleOption(label: string): void {
    this.applyFocusedMutation({
      type: "toggle_option",
      label,
    });
  }

  setCustomAnswer(value: string): void {
    this.applyFocusedMutation({
      type: "set_custom_answer",
      value,
    });
  }

  clearAnswer(): void {
    this.applyFocusedMutation({
      type: "clear_answer",
    });
  }

  submit(): SubmitQuestionnaireResult {
    const result = this.submitQuestionnaire({
      sessionID: this.questionnaire.sessionID,
      requestID: this.questionnaire.requestID,
    });

    if (
      !result.ok &&
      result.error instanceof InvalidQuestionnaireAnswersError
    ) {
      this.submissionProblemsValue = result.error.problems;
      return result;
    }

    if (!result.ok && result.error instanceof QuestionnaireNotActiveError) {
      throw new Error(result.error.message);
    }

    this.submissionProblemsValue = undefined;
    return result;
  }

  cancel(): CancelQuestionnaireResult {
    this.submissionProblemsValue = undefined;

    const result = this.cancelQuestionnaire({
      sessionID: this.questionnaire.sessionID,
      requestID: this.questionnaire.requestID,
    });

    if (!result.ok) {
      throw new Error(result.error.message);
    }

    return result;
  }

  dispose(): void {
    this.submissionProblemsValue = undefined;
    this.disposeQuestionnaire({
      sessionID: this.questionnaire.sessionID,
      requestID: this.questionnaire.requestID,
    });
  }

  private problemByQuestionIndex(): Map<number, string> {
    const problemByQuestionIndex = new Map<number, string>();

    this.submissionProblemsValue?.forEach((problem) => {
      if (problem.questionIndex !== undefined) {
        problemByQuestionIndex.set(problem.questionIndex, problem.message);
      }
    });

    return problemByQuestionIndex;
  }

  private applyFocusedMutation(
    mutation:
      | { type: "select_option"; label: string }
      | { type: "toggle_option"; label: string }
      | { type: "set_custom_answer"; value: string }
      | { type: "clear_answer" },
  ): void {
    switch (mutation.type) {
      case "select_option":
        this.applyMutation({
          sessionID: this.questionnaire.sessionID,
          requestID: this.questionnaire.requestID,
          mutation: {
            type: "select_option",
            questionIndex: this.currentQuestionIndexValue,
            label: mutation.label,
          },
        });
        return;
      case "toggle_option":
        this.applyMutation({
          sessionID: this.questionnaire.sessionID,
          requestID: this.questionnaire.requestID,
          mutation: {
            type: "toggle_option",
            questionIndex: this.currentQuestionIndexValue,
            label: mutation.label,
          },
        });
        return;
      case "set_custom_answer":
        this.applyMutation({
          sessionID: this.questionnaire.sessionID,
          requestID: this.questionnaire.requestID,
          mutation: {
            type: "set_custom_answer",
            questionIndex: this.currentQuestionIndexValue,
            value: mutation.value,
          },
        });
        return;
      case "clear_answer":
        this.applyMutation({
          sessionID: this.questionnaire.sessionID,
          requestID: this.questionnaire.requestID,
          mutation: {
            type: "clear_answer",
            questionIndex: this.currentQuestionIndexValue,
          },
        });
    }
  }

  private applyMutation(command: UpdateQuestionnaireAnswerCommand): void {
    this.submissionProblemsValue = undefined;

    const result = this.updateQuestionnaireAnswer(command);

    if (!result.ok) {
      throw new Error(result.error.message);
    }

    this.questionnaire = result.value;
  }
}

class QuestionnaireProgressViewModel {
  constructor(
    private readonly currentQuestionIndex: number,
    private readonly totalQuestionCount: number,
  ) {}

  currentQuestionNumber(): number {
    return this.currentQuestionIndex + 1;
  }

  totalQuestions(): number {
    return this.totalQuestionCount;
  }

  isFirstQuestion(): boolean {
    return this.currentQuestionIndex === 0;
  }

  isLastQuestion(): boolean {
    return this.currentQuestionIndex === this.totalQuestionCount - 1;
  }
}

class QuestionnaireCurrentQuestionViewModel {
  private readonly optionViewModels: QuestionnaireOptionViewModel[];

  constructor(
    private readonly questionIndex: number,
    private readonly questionData: QuestionnaireQuestionDto,
    private readonly selections: QuestionnaireDraftSelectionDto[],
    private readonly problemMessage: string | undefined,
  ) {
    this.optionViewModels = this.questionData.options.map(
      (option) =>
        new QuestionnaireOptionViewModel(
          option,
          this.selections.some(
            (selection) =>
              selection.source === "option" && selection.value === option.label,
          ),
        ),
    );
  }

  index(): number {
    return this.questionIndex;
  }

  header(): string {
    return this.questionData.header;
  }

  question(): string {
    return this.questionData.question;
  }

  allowsMultiple(): boolean {
    return this.questionData.multiSelect;
  }

  allowsCustom(): boolean {
    return this.questionData.allowCustom;
  }

  isRequired(): boolean {
    return this.questionData.required;
  }

  options(): QuestionnaireOptionViewModel[] {
    return [...this.optionViewModels];
  }

  customAnswer(): string | undefined {
    return this.selections.find((selection) => selection.source === "custom")
      ?.value;
  }

  problem(): string | undefined {
    return this.problemMessage;
  }
}

class QuestionnaireOptionViewModel {
  constructor(
    private readonly optionData: QuestionnaireOptionDto,
    private readonly selected: boolean,
  ) {}

  label(): string {
    return this.optionData.label;
  }

  description(): string | undefined {
    return this.optionData.description;
  }

  isSelected(): boolean {
    return this.selected;
  }
}

class QuestionnaireQuestionSummaryViewModel {
  constructor(
    private readonly questionIndex: number,
    private readonly questionText: string,
    private readonly answered: boolean,
    private readonly problemMessage: string | undefined,
  ) {}

  index(): number {
    return this.questionIndex;
  }

  question(): string {
    return this.questionText;
  }

  isAnswered(): boolean {
    return this.answered;
  }

  problem(): string | undefined {
    return this.problemMessage;
  }
}

function cloneDraftAnswers(
  draftAnswers: QuestionnaireDraftAnswersDto,
): QuestionnaireDraftAnswersDto {
  return draftAnswers.map((slot) => ({
    selections: slot.selections.map((selection) => ({ ...selection })),
  }));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
