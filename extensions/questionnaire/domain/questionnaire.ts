import { Result, type Result as ResultType } from "../result.js";
import {
  QuestionnaireSubmissionError,
  type QuestionnaireSubmissionIssue,
} from "./errors.js";
import type { AnswerSlot } from "./answer.js";
import type { QuestionnaireDefinition } from "./definition.js";

export interface QuestionnaireMetadata {
  requestID: string;
  sessionID: string;
}

export interface QuestionnaireAnswerSelection {
  source: "option" | "custom";
  value: string;
}

export interface QuestionnaireAnswerStateSlot {
  selections: QuestionnaireAnswerSelection[];
}

export type QuestionnaireAnswerState = QuestionnaireAnswerStateSlot[];

export type QuestionnaireSubmissionResult = ResultType<
  AnswerSlot[],
  QuestionnaireSubmissionError
>;

export { QuestionnaireSubmissionError };

export class Questionnaire {
  private constructor(
    private readonly metadata: QuestionnaireMetadata,
    private readonly definition: QuestionnaireDefinition,
    private readonly answers: QuestionnaireAnswerState,
  ) {}

  static start(
    metadata: QuestionnaireMetadata,
    definition: QuestionnaireDefinition,
  ): Questionnaire {
    return new Questionnaire(
      {
        requestID: metadata.requestID,
        sessionID: metadata.sessionID,
      },
      cloneDefinition(definition),
      definition.questions.map(() => ({ selections: [] })),
    );
  }

  getRequestID(): string {
    return this.metadata.requestID;
  }

  getSessionID(): string {
    return this.metadata.sessionID;
  }

  getDefinition(): QuestionnaireDefinition {
    return cloneDefinition(this.definition);
  }

  toAnswerState(): QuestionnaireAnswerState {
    return cloneAnswerState(this.answers);
  }

  selectOption(questionIndex: number, label: string): void {
    const question = this.definition.questions[questionIndex];
    const slot = this.answers[questionIndex];

    if (!question || !slot) {
      return;
    }

    if (question.multiSelect) {
      slot.selections = [...slot.selections, createOptionSelection(label)];
      return;
    }

    slot.selections = [createOptionSelection(label)];
  }

  toggleOption(questionIndex: number, label: string): void {
    const question = this.definition.questions[questionIndex];
    const slot = this.answers[questionIndex];

    if (!question || !slot) {
      return;
    }

    const optionIndex = slot.selections.findIndex(
      (selection) => selection.source === "option" && selection.value === label,
    );

    if (optionIndex >= 0) {
      slot.selections = slot.selections.filter(
        (_, index) => index !== optionIndex,
      );
      return;
    }

    if (!question.multiSelect) {
      slot.selections = [createOptionSelection(label)];
      return;
    }

    slot.selections = [...slot.selections, createOptionSelection(label)];
  }

  setCustomAnswer(questionIndex: number, value: string): void {
    const question = this.definition.questions[questionIndex];
    const slot = this.answers[questionIndex];

    if (!question || !slot) {
      return;
    }

    const optionSelections = slot.selections.filter(
      (selection) => selection.source === "option",
    );
    const customSelection = createCustomSelection(value);

    slot.selections = question.multiSelect
      ? [...optionSelections, customSelection]
      : [customSelection];
  }

  clearAnswer(questionIndex: number): void {
    const slot = this.answers[questionIndex];

    if (!slot) {
      return;
    }

    slot.selections = [];
  }

  submit(): QuestionnaireSubmissionResult {
    const issues: QuestionnaireSubmissionIssue[] = [];
    const submittedAnswers: AnswerSlot[] = [];

    this.definition.questions.forEach((question, questionIndex) => {
      const slot = this.answers[questionIndex];

      if (question.required && slot.selections.length === 0) {
        issues.push({
          questionIndex,
          message: `question at index ${questionIndex} requires at least one selection`,
        });
      }

      const optionLabels = new Set(
        question.options.map((option) => option.label),
      );

      slot.selections.forEach((selection) => {
        if (
          selection.source === "option" &&
          !optionLabels.has(selection.value)
        ) {
          issues.push({
            questionIndex,
            message: `question at index ${questionIndex} has invalid option selection: "${selection.value}"`,
          });
        }

        if (selection.source === "custom" && !question.allowCustom) {
          issues.push({
            questionIndex,
            message: `question at index ${questionIndex} does not allow custom selections`,
          });
        }
      });

      submittedAnswers.push({
        selections: slot.selections.map((selection) => selection.value),
      });
    });

    if (issues.length > 0) {
      return Result.error(new QuestionnaireSubmissionError(issues));
    }

    return Result.ok(submittedAnswers);
  }
}

function cloneDefinition(
  definition: QuestionnaireDefinition,
): QuestionnaireDefinition {
  return {
    ...(definition.title !== undefined ? { title: definition.title } : {}),
    ...(definition.instructions !== undefined
      ? { instructions: definition.instructions }
      : {}),
    questions: definition.questions.map((question) => ({
      header: question.header,
      question: question.question,
      options: question.options.map((option) => ({
        label: option.label,
        ...(option.description !== undefined
          ? { description: option.description }
          : {}),
      })),
      multiSelect: question.multiSelect,
      allowCustom: question.allowCustom,
      required: question.required,
    })),
  };
}

function createOptionSelection(label: string): QuestionnaireAnswerSelection {
  return { source: "option", value: label };
}

function createCustomSelection(value: string): QuestionnaireAnswerSelection {
  return { source: "custom", value };
}

function cloneAnswerState(
  answerState: QuestionnaireAnswerState,
): QuestionnaireAnswerState {
  return answerState.map((slot) => ({
    selections: slot.selections.map((selection) => ({ ...selection })),
  }));
}
