import { describe, expect, it } from "vitest";

import type { QuestionnaireDto } from "../../../../extensions/questionnaire/application/dto/questionnaire.js";
import type { SubmittedQuestionnaireDto } from "../../../../extensions/questionnaire/application/dto/questionnaire-submission.js";
import {
  InteractiveUIRequiredError,
  InvalidQuestionnaireRequestError,
  QuestionnaireAlreadyActiveError,
} from "../../../../extensions/questionnaire/application/errors.js";
import {
  mapCancelledOutcome,
  mapStartFailure,
  mapSubmittedOutcome,
} from "../../../../extensions/questionnaire/pi/tool/mapQuestionnaireToolResult.js";

function createQuestionnaireDto(): QuestionnaireDto {
  return {
    requestID: "req-123",
    sessionID: "session-1",
    title: "Implementation preferences",
    instructions: "Keep answers concise.",
    questions: [
      {
        header: "Framework",
        question: "Which frontend framework should I target?",
        options: [{ label: "React" }, { label: "Vue" }],
        multiSelect: false,
        allowCustom: true,
        required: true,
      },
    ],
    draftAnswers: [{ selections: [{ source: "option", value: "React" }] }],
  };
}

function createSubmittedQuestionnaireDto(): SubmittedQuestionnaireDto {
  return {
    questionnaire: createQuestionnaireDto(),
    responses: [
      {
        question: "Which frontend framework should I target?",
        selections: ["React"],
      },
    ],
  };
}

describe("mapQuestionnaireToolResult", () => {
  it("maps invalid request problems into failed tool details", () => {
    const result = mapStartFailure(
      new InvalidQuestionnaireRequestError([
        {
          path: "questions[0].options",
          message: "must include at least 2 options",
        },
        {
          message: "questions must not be empty",
        },
      ]),
    );

    expect(result).toEqual({
      isError: true,
      content: [{ type: "text", text: "Invalid questionnaire request." }],
      details: {
        status: "failed",
        reason: "invalid_request",
        errors: [
          "questions[0].options: must include at least 2 options",
          "questions must not be empty",
        ],
      },
    });
  });

  it("maps non-validation start failures into their failed reasons", () => {
    expect(mapStartFailure(new InteractiveUIRequiredError())).toMatchObject({
      isError: true,
      details: {
        status: "failed",
        reason: "interactive_ui_required",
      },
    });

    expect(
      mapStartFailure(new QuestionnaireAlreadyActiveError()),
    ).toMatchObject({
      isError: true,
      details: {
        status: "failed",
        reason: "questionnaire_already_active",
      },
    });
  });

  it("maps submitted and cancelled outcomes into tool envelopes", () => {
    const submission = createSubmittedQuestionnaireDto();
    const submitted = mapSubmittedOutcome(submission);
    const cancelled = mapCancelledOutcome(createQuestionnaireDto());

    expect(submitted).toEqual({
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
    });

    expect(cancelled).toMatchObject({
      isError: true,
      content: [{ type: "text", text: "Questionnaire cancelled by user." }],
      details: {
        status: "cancelled",
        reason: "user_cancelled",
        title: "Implementation preferences",
        instructions: "Keep answers concise.",
        questions: createQuestionnaireDto().questions,
      },
    });
  });
});
