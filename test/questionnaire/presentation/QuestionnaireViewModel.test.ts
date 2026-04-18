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
} from "../../../extensions/questionnaire/presentation/QuestionnaireViewModel.js";
import { QuestionnaireViewModel } from "../../../extensions/questionnaire/presentation/QuestionnaireViewModel.js";

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
      {
        header: "Testing",
        question: "Which testing layers should I include?",
        options: [
          { label: "Unit tests", description: "Fastest feedback loop" },
          { label: "Integration tests" },
          { label: "E2E tests" },
        ],
        multiSelect: true,
        allowCustom: true,
        required: false,
      },
    ],
    draftAnswers: [
      {
        selections: [{ source: "option", value: "React" }],
      },
      {
        selections: [
          { source: "option", value: "E2E tests" },
          { source: "custom", value: "Performance tests" },
        ],
      },
    ],
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

describe("QuestionnaireViewModel", () => {
  it("initializes from questionnaire data and starts at question index 0", () => {
    const viewModel = new QuestionnaireViewModel(
      createMultiQuestionQuestionnaire(),
      createAnswerUpdateStub(createMultiQuestionQuestionnaire()),
      createSubmitSuccess(),
      createCancelSuccess(),
    );

    expect(viewModel.currentQuestionIndex()).toBe(0);
    expect(viewModel.progress().currentQuestionNumber()).toBe(1);
    expect(viewModel.progress().isFirstQuestion()).toBe(true);
    expect(viewModel.currentQuestion().index()).toBe(0);
    expect(viewModel.currentQuestion().question()).toBe(
      "Which frontend framework should I target?",
    );
  });

  it("derives progress and current question details from its owned state", () => {
    const viewModel = new QuestionnaireViewModel(
      createMultiQuestionQuestionnaire(),
      createAnswerUpdateStub(createMultiQuestionQuestionnaire()),
      createSubmitSuccess(),
      createCancelSuccess(),
    );

    viewModel.nextQuestion();

    expect(viewModel.title()).toBe("Implementation preferences");
    expect(viewModel.instructions()).toBe("Keep answers concise.");
    expect(viewModel.progress().currentQuestionNumber()).toBe(2);
    expect(viewModel.progress().totalQuestions()).toBe(2);
    expect(viewModel.progress().isFirstQuestion()).toBe(false);
    expect(viewModel.progress().isLastQuestion()).toBe(true);

    const currentQuestion = viewModel.currentQuestion();

    expect(currentQuestion.index()).toBe(1);
    expect(currentQuestion.header()).toBe("Testing");
    expect(currentQuestion.question()).toBe(
      "Which testing layers should I include?",
    );
    expect(currentQuestion.allowsMultiple()).toBe(true);
    expect(currentQuestion.allowsCustom()).toBe(true);
    expect(currentQuestion.isRequired()).toBe(false);
    expect(currentQuestion.customAnswer()).toBe("Performance tests");
  });

  it("marks selected options from draft answers and exposes option descriptions", () => {
    const viewModel = new QuestionnaireViewModel(
      createMultiQuestionQuestionnaire(),
      createAnswerUpdateStub(createMultiQuestionQuestionnaire()),
      createSubmitSuccess(),
      createCancelSuccess(),
    );

    viewModel.nextQuestion();

    expect(
      viewModel
        .currentQuestion()
        .options()
        .map((option) => ({
          label: option.label(),
          description: option.description(),
          selected: option.isSelected(),
        })),
    ).toEqual([
      {
        label: "Unit tests",
        description: "Fastest feedback loop",
        selected: false,
      },
      {
        label: "Integration tests",
        description: undefined,
        selected: false,
      },
      {
        label: "E2E tests",
        description: undefined,
        selected: true,
      },
    ]);
  });

  it("keeps navigation bounded to the questionnaire range", () => {
    const viewModel = new QuestionnaireViewModel(
      createMultiQuestionQuestionnaire(),
      createAnswerUpdateStub(createMultiQuestionQuestionnaire()),
      createSubmitSuccess(),
      createCancelSuccess(),
    );

    viewModel.previousQuestion();
    expect(viewModel.currentQuestionIndex()).toBe(0);

    viewModel.nextQuestion();
    viewModel.nextQuestion();
    expect(viewModel.currentQuestionIndex()).toBe(1);
    expect(viewModel.progress().isLastQuestion()).toBe(true);
  });

  it("selecting an option updates the questionnaire data it projects", () => {
    const viewModel = new QuestionnaireViewModel(
      createSingleSelectQuestionnaire(),
      createAnswerUpdateStub(createSingleSelectQuestionnaire()),
      createSubmitSuccess(),
      createCancelSuccess(),
    );

    viewModel.selectOption(0, "Vue");

    expect(viewModel.draftAnswers()).toEqual([
      {
        selections: [{ source: "option", value: "Vue" }],
      },
    ]);
    expect(
      viewModel
        .currentQuestion()
        .options()
        .map((option) => ({
          label: option.label(),
          selected: option.isSelected(),
        })),
    ).toEqual([
      { label: "React", selected: false },
      { label: "Vue", selected: true },
    ]);
  });

  it("toggles options and custom answers through application updates", () => {
    const viewModel = new QuestionnaireViewModel(
      createMultiQuestionQuestionnaire(),
      createAnswerUpdateStub(createMultiQuestionQuestionnaire()),
      createSubmitSuccess(),
      createCancelSuccess(),
    );

    viewModel.nextQuestion();
    viewModel.toggleOption(1, "Unit tests");
    viewModel.toggleOption(1, "E2E tests");
    viewModel.toggleOption(1, "Unit tests");
    viewModel.setCustomAnswer(1, "Load tests");

    expect(viewModel.draftAnswers()[1]).toEqual({
      selections: [{ source: "custom", value: "Load tests" }],
    });
    expect(viewModel.currentQuestion().customAnswer()).toBe("Load tests");
  });

  it("clearing an answer empties the projected draft slot", () => {
    const viewModel = new QuestionnaireViewModel(
      createSingleSelectQuestionnaire(),
      createAnswerUpdateStub({
        ...createSingleSelectQuestionnaire(),
        draftAnswers: [
          {
            selections: [{ source: "option", value: "React" }],
          },
        ],
      }),
      createSubmitSuccess(),
      createCancelSuccess(),
    );

    viewModel.clearAnswer(0);

    expect(viewModel.draftAnswers()).toEqual([{ selections: [] }]);
  });

  it("maps submission issues to the matching question after failed submit", () => {
    const viewModel = new QuestionnaireViewModel(
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

    const result = viewModel.submit();

    expect(result.ok).toBe(false);
    expect(viewModel.currentQuestion().issue()).toBe(
      "question at index 0 requires at least one selection",
    );
    expect(viewModel.questions()[0]?.issue()).toBe(
      "question at index 0 requires at least one selection",
    );
  });

  it("clears submission issues after any subsequent mutation", () => {
    const viewModel = new QuestionnaireViewModel(
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

    viewModel.submit();
    viewModel.selectOption(0, "React");

    expect(viewModel.currentQuestion().issue()).toBeUndefined();
    expect(viewModel.questions()[0]?.issue()).toBeUndefined();
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
    const viewModel = new QuestionnaireViewModel(
      createSingleSelectQuestionnaire(),
      createAnswerUpdateStub(createSingleSelectQuestionnaire()),
      submitQuestionnaire,
      createCancelSuccess(),
    );

    viewModel.submit();
    viewModel.selectOption(0, "React");

    const result = viewModel.submit();

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
    expect(viewModel.currentQuestion().issue()).toBeUndefined();
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
    const viewModel = new QuestionnaireViewModel(
      createSingleSelectQuestionnaire(),
      createAnswerUpdateStub(createSingleSelectQuestionnaire()),
      createSubmitSuccess(),
      cancelQuestionnaire,
    );

    expect(viewModel.cancel()).toEqual({
      ok: true,
      value: questionnaire,
    });
  });

  it("throws when cancel reports no active questionnaire", () => {
    const viewModel = new QuestionnaireViewModel(
      createSingleSelectQuestionnaire(),
      createAnswerUpdateStub(createSingleSelectQuestionnaire()),
      createSubmitSuccess(),
      () => ({
        ok: false,
        error: new QuestionnaireNotActiveError(),
      }),
    );

    expect(() => viewModel.cancel()).toThrowError(
      "Questionnaire is not active.",
    );
  });

  it("throws when a mutation result reports no active questionnaire", () => {
    const viewModel = new QuestionnaireViewModel(
      createSingleSelectQuestionnaire(),
      () => ({
        ok: false,
        error: new QuestionnaireNotActiveError(),
      }),
      createSubmitSuccess(),
      createCancelSuccess(),
    );

    expect(() => viewModel.selectOption(0, "React")).toThrowError(
      "Questionnaire is not active.",
    );
  });

  it("rejects questionnaires without questions", () => {
    expect(
      () =>
        new QuestionnaireViewModel(
          {
            requestID: "req-123",
            sessionID: "session-1",
            questions: [],
            draftAnswers: [],
          },
          createAnswerUpdateStub(createSingleSelectQuestionnaire()),
          createSubmitSuccess(),
          createCancelSuccess(),
        ),
    ).toThrowError("QuestionnaireDto must contain at least one question.");
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
