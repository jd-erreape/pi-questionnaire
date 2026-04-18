import { describe, expect, it } from "vitest";

import type {
  QuestionnaireDraftAnswerMutationDto,
  QuestionnaireDraftAnswersDto,
} from "../../../extensions/questionnaire/application/dto/questionnaire-draft-answers.js";
import type { QuestionnaireSubmissionIssueDto } from "../../../extensions/questionnaire/application/dto/questionnaire-issues.js";
import type { QuestionnaireDto } from "../../../extensions/questionnaire/application/dto/questionnaire.js";
import {
  InvalidQuestionnaireAnswersError,
  QuestionnaireNotActiveError,
} from "../../../extensions/questionnaire/application/errors.js";
import type {
  CancelQuestionnaireFunction,
  SubmitQuestionnaireFunction,
  UpdateQuestionnaireAnswerFunction,
} from "../../../extensions/questionnaire/presentation/controller/QuestionnaireInteractionController.js";
import { QuestionnaireInteractionController } from "../../../extensions/questionnaire/presentation/controller/QuestionnaireInteractionController.js";

function createSingleSelectQuestionnaire(): QuestionnaireDto {
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
    draftAnswers: [{ selections: [] }],
  };
}

function createMultiQuestionQuestionnaire(): QuestionnaireDto {
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
    draftAnswers: [{ selections: [] }, { selections: [] }],
  };
}

function createAnswerUpdateStub(
  initialQuestionnaire: QuestionnaireDto,
): UpdateQuestionnaireAnswerFunction {
  let draftAnswers = cloneDraftAnswers(initialQuestionnaire.draftAnswers);

  return ({ mutation }) => {
    draftAnswers = applyMutation(draftAnswers, mutation);
    return {
      ok: true,
      value: {
        ...initialQuestionnaire,
        draftAnswers: cloneDraftAnswers(draftAnswers),
      },
    };
  };
}

function createSubmitSuccess(): SubmitQuestionnaireFunction {
  return () => ({
    ok: true,
    value: {
      questionnaire: {
        ...createSingleSelectQuestionnaire(),
        draftAnswers: [
          {
            selections: [{ source: "option", value: "React" }],
          },
        ],
      },
      responses: [
        {
          question: "Which frontend framework should I target?",
          selections: ["React"],
        },
      ],
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

function createCancelSuccess(): CancelQuestionnaireFunction {
  return () => ({
    ok: true,
    value: createSingleSelectQuestionnaire(),
  });
}

describe("QuestionnaireInteractionController", () => {
  it("initializes from the questionnaire draft answers and starts at question index 0", () => {
    const controller = new QuestionnaireInteractionController(
      createMultiQuestionQuestionnaire(),
      createAnswerUpdateStub(createMultiQuestionQuestionnaire()),
      createSubmitSuccess(),
      createCancelSuccess(),
    );

    expect(controller.getState()).toEqual({
      currentQuestionIndex: 0,
      draftAnswers: [{ selections: [] }, { selections: [] }],
      submissionIssues: undefined,
    });
  });

  it("selecting an option updates the draft answers for a single-select question", () => {
    const controller = new QuestionnaireInteractionController(
      createSingleSelectQuestionnaire(),
      createAnswerUpdateStub(createSingleSelectQuestionnaire()),
      createSubmitSuccess(),
      createCancelSuccess(),
    );

    controller.selectOption(0, "Vue");

    expect(controller.getState().draftAnswers).toEqual([
      {
        selections: [{ source: "option", value: "Vue" }],
      },
    ]);
  });

  it("toggling options updates the draft answers for a multi-select question", () => {
    const controller = new QuestionnaireInteractionController(
      createMultiQuestionQuestionnaire(),
      createAnswerUpdateStub(createMultiQuestionQuestionnaire()),
      createSubmitSuccess(),
      createCancelSuccess(),
    );

    controller.toggleOption(1, "Unit tests");
    controller.toggleOption(1, "E2E tests");

    expect(controller.getState().draftAnswers[1]).toEqual({
      selections: [
        { source: "option", value: "Unit tests" },
        { source: "option", value: "E2E tests" },
      ],
    });

    controller.toggleOption(1, "Unit tests");

    expect(controller.getState().draftAnswers[1]).toEqual({
      selections: [{ source: "option", value: "E2E tests" }],
    });
  });

  it("setting a custom answer updates the draft answers with custom provenance", () => {
    const controller = new QuestionnaireInteractionController(
      createMultiQuestionQuestionnaire(),
      createAnswerUpdateStub(createMultiQuestionQuestionnaire()),
      createSubmitSuccess(),
      createCancelSuccess(),
    );

    controller.setCustomAnswer(1, "Performance tests");

    expect(controller.getState().draftAnswers[1]).toEqual({
      selections: [{ source: "custom", value: "Performance tests" }],
    });
  });

  it("clearing an answer empties the draft slot", () => {
    const controller = new QuestionnaireInteractionController(
      createSingleSelectQuestionnaire(),
      createAnswerUpdateStub(createSingleSelectQuestionnaire()),
      createSubmitSuccess(),
      createCancelSuccess(),
    );

    controller.selectOption(0, "React");
    controller.clearAnswer(0);

    expect(controller.getState().draftAnswers).toEqual([{ selections: [] }]);
  });

  it("failed submit stores issues in controller state", () => {
    const controller = new QuestionnaireInteractionController(
      createSingleSelectQuestionnaire(),
      createAnswerUpdateStub(createSingleSelectQuestionnaire()),
      createSubmitFailure([
        {
          questionIndex: 0,
          message: "question at index 0 requires at least one selection",
        },
      ]),
      createCancelSuccess(),
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

  it("successful submit returns finalized responses and clears previous issues", () => {
    const questionnaire: QuestionnaireDto = {
      ...createSingleSelectQuestionnaire(),
      draftAnswers: [
        {
          selections: [{ source: "option", value: "React" }],
        },
      ],
    };
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
          questionnaire,
          responses: [
            {
              question: "Which frontend framework should I target?",
              selections: ["React"],
            },
          ],
        },
      };
    };
    const controller = new QuestionnaireInteractionController(
      createSingleSelectQuestionnaire(),
      createAnswerUpdateStub(createSingleSelectQuestionnaire()),
      submitQuestionnaire,
      createCancelSuccess(),
    );

    controller.submit();
    controller.selectOption(0, "React");

    const result = controller.submit();

    expect(result).toEqual({
      ok: true,
      value: {
        questionnaire,
        responses: [
          {
            question: "Which frontend framework should I target?",
            selections: ["React"],
          },
        ],
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
      createSingleSelectQuestionnaire(),
      createAnswerUpdateStub(createSingleSelectQuestionnaire()),
      createSubmitFailure([
        {
          questionIndex: 0,
          message: "question at index 0 requires at least one selection",
        },
      ]),
      createCancelSuccess(),
    );

    controller.submit();
    controller.selectOption(0, "Vue");

    expect(controller.getState().submissionIssues).toBeUndefined();
  });

  it("cancels the active questionnaire and returns its questionnaire data", () => {
    const questionnaire = createSingleSelectQuestionnaire();
    const cancelQuestionnaire: CancelQuestionnaireFunction = (command) => ({
      ok: true,
      value: {
        ...questionnaire,
        requestID: command.requestID,
        sessionID: command.sessionID,
      },
    });
    const controller = new QuestionnaireInteractionController(
      createSingleSelectQuestionnaire(),
      createAnswerUpdateStub(createSingleSelectQuestionnaire()),
      createSubmitSuccess(),
      cancelQuestionnaire,
    );

    expect(controller.cancel()).toEqual({
      ok: true,
      value: questionnaire,
    });
  });

  it("throws when cancel reports no active questionnaire", () => {
    const controller = new QuestionnaireInteractionController(
      createSingleSelectQuestionnaire(),
      createAnswerUpdateStub(createSingleSelectQuestionnaire()),
      createSubmitSuccess(),
      () => ({
        ok: false,
        error: new QuestionnaireNotActiveError(),
      }),
    );

    expect(() => controller.cancel()).toThrowError(
      "Questionnaire is not active.",
    );
  });

  it("throws when a mutation result reports no active questionnaire", () => {
    const controller = new QuestionnaireInteractionController(
      createSingleSelectQuestionnaire(),
      () => ({
        ok: false,
        error: new QuestionnaireNotActiveError(),
      }),
      createSubmitSuccess(),
      createCancelSuccess(),
    );

    expect(() => controller.selectOption(0, "React")).toThrowError(
      "Questionnaire is not active.",
    );
  });
});

function applyMutation(
  draftAnswers: QuestionnaireDraftAnswersDto,
  mutation: QuestionnaireDraftAnswerMutationDto,
): QuestionnaireDraftAnswersDto {
  const next = cloneDraftAnswers(draftAnswers);
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

function cloneDraftAnswers(
  draftAnswers: QuestionnaireDraftAnswersDto,
): QuestionnaireDraftAnswersDto {
  return draftAnswers.map((slot) => ({
    selections: slot.selections.map((selection) => ({ ...selection })),
  }));
}
