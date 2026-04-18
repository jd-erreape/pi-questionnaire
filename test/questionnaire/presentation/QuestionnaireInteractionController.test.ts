import { describe, expect, it } from "vitest";

import type {
  QuestionnaireAnswerMutationDto,
  QuestionnaireAnswerStateDto,
} from "../../../extensions/questionnaire/application/dto/questionnaire-answer-state.js";
import type { QuestionnaireSubmissionIssueDto } from "../../../extensions/questionnaire/application/dto/questionnaire-issues.js";
import type { QuestionnaireInstanceDto } from "../../../extensions/questionnaire/application/dto/questionnaire-instance.js";
import {
  InvalidQuestionnaireAnswersError,
  QuestionnaireNotActiveError,
} from "../../../extensions/questionnaire/application/errors.js";
import type {
  SubmitQuestionnaireFunction,
  UpdateQuestionnaireAnswerFunction,
} from "../../../extensions/questionnaire/presentation/controller/QuestionnaireInteractionController.js";
import { QuestionnaireInteractionController } from "../../../extensions/questionnaire/presentation/controller/QuestionnaireInteractionController.js";

function createSingleSelectInstance(): QuestionnaireInstanceDto {
  return {
    requestID: "req-123",
    sessionID: "session-1",
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
  };
}

function createMultiQuestionInstance(): QuestionnaireInstanceDto {
  return {
    requestID: "req-123",
    sessionID: "session-1",
    questions: [
      {
        header: "Framework",
        question: "Which frontend framework should I target?",
        options: [{ label: "React" }, { label: "Vue" }],
        multiSelect: false,
        allowCustom: true,
        required: true,
      },
      {
        header: "Testing",
        question: "Which testing layers should I include?",
        options: [
          { label: "Unit tests" },
          { label: "Integration tests" },
          { label: "E2E tests" },
        ],
        multiSelect: true,
        allowCustom: true,
        required: false,
      },
    ],
  };
}

function createAnswerUpdateStub(
  initialAnswers: QuestionnaireAnswerStateDto,
): UpdateQuestionnaireAnswerFunction {
  let answers = cloneAnswerState(initialAnswers);

  return ({ mutation }) => {
    answers = applyMutation(answers, mutation);
    return {
      ok: true,
      value: cloneAnswerState(answers),
    };
  };
}

function createSubmitSuccess(): SubmitQuestionnaireFunction {
  return () => ({
    ok: true,
    value: {
      instance: createSingleSelectInstance(),
      answers: [{ selections: ["React"], custom: false }],
    },
  });
}

function createSubmitFailure(
  issues: QuestionnaireSubmissionIssueDto[],
): SubmitQuestionnaireFunction {
  return () => ({
    ok: false,
    error: new InvalidQuestionnaireAnswersError(issues),
  });
}

describe("QuestionnaireInteractionController", () => {
  it("initializes answer state locally and starts at question index 0", () => {
    const controller = new QuestionnaireInteractionController(
      createMultiQuestionInstance(),
      createAnswerUpdateStub([{ selections: [] }, { selections: [] }]),
      createSubmitSuccess(),
    );

    expect(controller.getState()).toEqual({
      currentQuestionIndex: 0,
      answers: [{ selections: [] }, { selections: [] }],
      submissionIssues: undefined,
    });
  });

  it("selecting an option updates the answers for a single-select question", () => {
    const controller = new QuestionnaireInteractionController(
      createSingleSelectInstance(),
      createAnswerUpdateStub([{ selections: [] }]),
      createSubmitSuccess(),
    );

    controller.selectOption(0, "Vue");

    expect(controller.getState().answers).toEqual([
      {
        selections: [{ source: "option", value: "Vue" }],
      },
    ]);
  });

  it("toggling options updates the answers for a multi-select question", () => {
    const controller = new QuestionnaireInteractionController(
      createMultiQuestionInstance(),
      createAnswerUpdateStub([{ selections: [] }, { selections: [] }]),
      createSubmitSuccess(),
    );

    controller.toggleOption(1, "Unit tests");
    controller.toggleOption(1, "E2E tests");

    expect(controller.getState().answers[1]).toEqual({
      selections: [
        { source: "option", value: "Unit tests" },
        { source: "option", value: "E2E tests" },
      ],
    });

    controller.toggleOption(1, "Unit tests");

    expect(controller.getState().answers[1]).toEqual({
      selections: [{ source: "option", value: "E2E tests" }],
    });
  });

  it("setting a custom answer updates the answers with custom provenance", () => {
    const controller = new QuestionnaireInteractionController(
      createMultiQuestionInstance(),
      createAnswerUpdateStub([{ selections: [] }, { selections: [] }]),
      createSubmitSuccess(),
    );

    controller.setCustomAnswer(1, "Performance tests");

    expect(controller.getState().answers[1]).toEqual({
      selections: [{ source: "custom", value: "Performance tests" }],
    });
  });

  it("clearing an answer empties the slot", () => {
    const controller = new QuestionnaireInteractionController(
      createSingleSelectInstance(),
      createAnswerUpdateStub([{ selections: [] }]),
      createSubmitSuccess(),
    );

    controller.selectOption(0, "React");
    controller.clearAnswer(0);

    expect(controller.getState().answers).toEqual([{ selections: [] }]);
  });

  it("failed submit stores issues in controller state", () => {
    const controller = new QuestionnaireInteractionController(
      createSingleSelectInstance(),
      createAnswerUpdateStub([{ selections: [] }]),
      createSubmitFailure([
        {
          questionIndex: 0,
          message: "question at index 0 requires at least one selection",
        },
      ]),
    );

    const result = controller.submit();

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected invalid answers error");
    }

    expect(result.error).toBeInstanceOf(InvalidQuestionnaireAnswersError);
    if (!(result.error instanceof InvalidQuestionnaireAnswersError)) {
      throw new Error("Expected InvalidQuestionnaireAnswersError");
    }

    expect(result.error.issues).toEqual([
      {
        questionIndex: 0,
        message: "question at index 0 requires at least one selection",
      },
    ]);
    expect(controller.getState().submissionIssues).toEqual([
      {
        questionIndex: 0,
        message: "question at index 0 requires at least one selection",
      },
    ]);
  });

  it("successful submit returns finalized answers and clears previous issues", () => {
    const instance = createSingleSelectInstance();
    let submitCalls: Array<{ sessionID: string; requestID: string }> = [];
    let callCount = 0;
    const submitQuestionnaire: SubmitQuestionnaireFunction = (command) => {
      submitCalls = [...submitCalls, command];
      callCount += 1;

      if (callCount === 1) {
        return {
          ok: false,
          error: new InvalidQuestionnaireAnswersError([
            {
              questionIndex: 0,
              message: "question at index 0 requires at least one selection",
            },
          ]),
        };
      }

      return {
        ok: true,
        value: {
          instance,
          answers: [{ selections: ["React"], custom: false }],
        },
      };
    };
    const controller = new QuestionnaireInteractionController(
      instance,
      createAnswerUpdateStub([{ selections: [] }]),
      submitQuestionnaire,
    );

    controller.submit();
    controller.selectOption(0, "React");

    const result = controller.submit();

    expect(result).toEqual({
      ok: true,
      value: {
        instance,
        answers: [{ selections: ["React"], custom: false }],
      },
    });
    expect(submitCalls).toEqual([
      { sessionID: "session-1", requestID: "req-123" },
      { sessionID: "session-1", requestID: "req-123" },
    ]);
    expect(controller.getState().submissionIssues).toBeUndefined();
  });

  it("any mutation after a failed submit clears previous issues", () => {
    const controller = new QuestionnaireInteractionController(
      createSingleSelectInstance(),
      createAnswerUpdateStub([{ selections: [] }]),
      createSubmitFailure([
        {
          questionIndex: 0,
          message: "question at index 0 requires at least one selection",
        },
      ]),
    );

    controller.submit();
    controller.selectOption(0, "Vue");

    expect(controller.getState().submissionIssues).toBeUndefined();
  });

  it("throws when a mutation result reports no active questionnaire", () => {
    const controller = new QuestionnaireInteractionController(
      createSingleSelectInstance(),
      () => ({
        ok: false,
        error: new QuestionnaireNotActiveError(),
      }),
      createSubmitSuccess(),
    );

    expect(() => controller.selectOption(0, "React")).toThrowError(
      "Questionnaire is not active.",
    );
  });
});

function applyMutation(
  answers: QuestionnaireAnswerStateDto,
  mutation: QuestionnaireAnswerMutationDto,
): QuestionnaireAnswerStateDto {
  const next = cloneAnswerState(answers);
  const slot = next[mutation.questionIndex];

  if (!slot) {
    return next;
  }

  switch (mutation.type) {
    case "select_option":
      slot.selections = [{ source: "option", value: mutation.label }];
      return next;
    case "toggle_option": {
      const existingIndex = slot.selections.findIndex(
        (selection) =>
          selection.source === "option" && selection.value === mutation.label,
      );

      if (existingIndex >= 0) {
        slot.selections = slot.selections.filter(
          (_, index) => index !== existingIndex,
        );
        return next;
      }

      slot.selections = [
        ...slot.selections,
        { source: "option", value: mutation.label },
      ];
      return next;
    }
    case "set_custom_answer": {
      const optionSelections = slot.selections.filter(
        (selection) => selection.source === "option",
      );
      slot.selections = [
        ...optionSelections,
        { source: "custom", value: mutation.value },
      ];
      return next;
    }
    case "clear_answer":
      slot.selections = [];
      return next;
  }
}

function cloneAnswerState(
  answers: QuestionnaireAnswerStateDto,
): QuestionnaireAnswerStateDto {
  return answers.map((slot) => ({
    selections: slot.selections.map((selection) => ({ ...selection })),
  }));
}
