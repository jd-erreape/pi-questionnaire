import type { AgentToolResult } from "@mariozechner/pi-coding-agent";

import type { QuestionnaireDto } from "../application/dto/questionnaire.js";
import type {
  QuestionnaireCancelledDetailsDto,
  QuestionnaireDetailsDto,
  QuestionnaireSuccessDetailsDto,
  QuestionnaireValidationFailureDetailsDto,
} from "../application/dto/questionnaire-result.js";
import type { SubmittedQuestionnaireDto } from "../application/dto/questionnaire-submission.js";
import {
  InteractiveUIRequiredError,
  InvalidQuestionnaireRequestError,
  QuestionnaireAlreadyActiveError,
} from "../application/errors.js";

export type QuestionnaireToolResult<TDetails extends QuestionnaireDetailsDto> =
  AgentToolResult<TDetails> & {
    isError?: boolean;
  };

export function mapStartFailure(
  error:
    | InvalidQuestionnaireRequestError
    | InteractiveUIRequiredError
    | QuestionnaireAlreadyActiveError,
): QuestionnaireToolResult<QuestionnaireDetailsDto> {
  if (error instanceof InvalidQuestionnaireRequestError) {
    const details: QuestionnaireValidationFailureDetailsDto = {
      status: "failed",
      reason: "invalid_request",
      errors: error.problems.map((problem) =>
        problem.path ? `${problem.path}: ${problem.message}` : problem.message,
      ),
    };

    return {
      isError: true,
      content: [{ type: "text", text: error.message }],
      details,
    };
  }

  if (error instanceof InteractiveUIRequiredError) {
    return {
      isError: true,
      content: [{ type: "text", text: error.message }],
      details: {
        status: "failed",
        reason: "interactive_ui_required",
      },
    };
  }

  return {
    isError: true,
    content: [{ type: "text", text: error.message }],
    details: {
      status: "failed",
      reason: "questionnaire_already_active",
    },
  };
}

export function mapSubmittedOutcome(
  submission: SubmittedQuestionnaireDto,
): AgentToolResult<QuestionnaireSuccessDetailsDto> {
  return {
    content: [
      {
        type: "text",
        text: [
          "Questionnaire submitted.",
          "Responses:",
          JSON.stringify(submission.responses, null, 2),
        ].join("\n"),
      },
    ],
    details: {
      status: "submitted",
      responses: submission.responses,
    },
  };
}

export function mapCancelledOutcome(
  questionnaire: QuestionnaireDto,
): QuestionnaireToolResult<QuestionnaireCancelledDetailsDto> {
  const definition = {
    ...(questionnaire.title !== undefined
      ? { title: questionnaire.title }
      : {}),
    ...(questionnaire.instructions !== undefined
      ? { instructions: questionnaire.instructions }
      : {}),
    questions: questionnaire.questions,
  };

  return {
    isError: true,
    content: [{ type: "text", text: "Questionnaire cancelled by user." }],
    details: {
      status: "cancelled",
      reason: "user_cancelled",
      ...definition,
    },
  };
}
