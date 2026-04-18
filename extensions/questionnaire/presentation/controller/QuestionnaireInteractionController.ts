import type {
  QuestionnaireAnswerStateDto,
  QuestionnaireAnswerStateSlotDto,
} from "../../application/dto/questionnaire-answer-state.js";
import type { QuestionnaireInstanceDto } from "../../application/dto/questionnaire-instance.js";
import type { QuestionnaireSubmissionIssueDto } from "../../application/dto/questionnaire-issues.js";
import {
  InvalidQuestionnaireAnswersError,
  QuestionnaireNotActiveError,
} from "../../application/errors.js";
import type {
  CancelQuestionnaireCommand,
  CancelQuestionnaireResult,
} from "../../application/use-cases/cancelQuestionnaire.js";
import type {
  SubmitQuestionnaireCommand,
  SubmitQuestionnaireResult,
} from "../../application/use-cases/submitQuestionnaire.js";
import type {
  UpdateQuestionnaireAnswerCommand,
  UpdateQuestionnaireAnswerResult,
} from "../../application/use-cases/updateQuestionnaireAnswer.js";

export type UpdateQuestionnaireAnswerFunction = (
  command: UpdateQuestionnaireAnswerCommand,
) => UpdateQuestionnaireAnswerResult;

export type SubmitQuestionnaireFunction = (
  command: SubmitQuestionnaireCommand,
) => SubmitQuestionnaireResult;

export type CancelQuestionnaireFunction = (
  command: CancelQuestionnaireCommand,
) => CancelQuestionnaireResult;

export type { SubmitQuestionnaireResult, CancelQuestionnaireResult };

export interface QuestionnaireInteractionState {
  currentQuestionIndex: number;
  answers: QuestionnaireAnswerStateDto;
  submissionIssues?: QuestionnaireSubmissionIssueDto[];
}

export class QuestionnaireInteractionController {
  private readonly sessionID: string;
  private readonly requestID: string;
  private answers: QuestionnaireAnswerStateDto;
  private currentQuestionIndex = 0;
  private submissionIssues: QuestionnaireSubmissionIssueDto[] | undefined;

  constructor(
    private readonly instance: QuestionnaireInstanceDto,
    private readonly updateQuestionnaireAnswer: UpdateQuestionnaireAnswerFunction,
    private readonly submitQuestionnaire: SubmitQuestionnaireFunction,
    private readonly cancelQuestionnaire: CancelQuestionnaireFunction,
  ) {
    this.sessionID = instance.sessionID;
    this.requestID = instance.requestID;
    this.answers = instance.questions.map<QuestionnaireAnswerStateSlotDto>(
      () => ({
        selections: [],
      }),
    );
  }

  getState(): QuestionnaireInteractionState {
    return {
      currentQuestionIndex: this.currentQuestionIndex,
      answers: cloneAnswerState(this.answers),
      submissionIssues: this.submissionIssues,
    };
  }

  nextQuestion(): void {
    this.currentQuestionIndex = Math.min(
      this.currentQuestionIndex + 1,
      this.instance.questions.length - 1,
    );
  }

  previousQuestion(): void {
    this.currentQuestionIndex = Math.max(this.currentQuestionIndex - 1, 0);
  }

  selectOption(questionIndex: number, label: string): void {
    this.applyMutation({
      sessionID: this.sessionID,
      requestID: this.requestID,
      mutation: {
        type: "select_option",
        questionIndex,
        label,
      },
    });
  }

  toggleOption(questionIndex: number, label: string): void {
    this.applyMutation({
      sessionID: this.sessionID,
      requestID: this.requestID,
      mutation: {
        type: "toggle_option",
        questionIndex,
        label,
      },
    });
  }

  setCustomAnswer(questionIndex: number, value: string): void {
    this.applyMutation({
      sessionID: this.sessionID,
      requestID: this.requestID,
      mutation: {
        type: "set_custom_answer",
        questionIndex,
        value,
      },
    });
  }

  clearAnswer(questionIndex: number): void {
    this.applyMutation({
      sessionID: this.sessionID,
      requestID: this.requestID,
      mutation: {
        type: "clear_answer",
        questionIndex,
      },
    });
  }

  submit(): SubmitQuestionnaireResult {
    const result = this.submitQuestionnaire({
      sessionID: this.sessionID,
      requestID: this.requestID,
    });

    if (
      !result.ok &&
      result.error instanceof InvalidQuestionnaireAnswersError
    ) {
      this.submissionIssues = result.error.issues;
      return result;
    }

    if (!result.ok && result.error instanceof QuestionnaireNotActiveError) {
      throw new Error(result.error.message);
    }

    this.submissionIssues = undefined;
    return result;
  }

  cancel(): CancelQuestionnaireResult {
    this.submissionIssues = undefined;

    const result = this.cancelQuestionnaire({
      sessionID: this.sessionID,
      requestID: this.requestID,
    });

    if (!result.ok) {
      throw new Error(result.error.message);
    }

    return result;
  }

  private applyMutation(command: UpdateQuestionnaireAnswerCommand): void {
    this.submissionIssues = undefined;

    const result = this.updateQuestionnaireAnswer(command);

    if (!result.ok) {
      throw new Error(result.error.message);
    }

    this.answers = result.value;
  }
}

function cloneAnswerState(
  answers: QuestionnaireAnswerStateDto,
): QuestionnaireAnswerStateDto {
  return answers.map((slot) => ({
    selections: slot.selections.map((selection) => ({ ...selection })),
  }));
}
