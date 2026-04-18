import { describe, expect, it } from "vitest";

import type {
  QuestionnaireDraftAnswerMutationDto,
  QuestionnaireDraftAnswersDto,
} from "../../../extensions/questionnaire/application/dto/questionnaire-draft-answers.js";
import type { QuestionnaireSubmissionProblemDto } from "../../../extensions/questionnaire/application/dto/questionnaire-problems.js";
import type { QuestionnaireDto } from "../../../extensions/questionnaire/application/dto/questionnaire.js";
import { InvalidQuestionnaireAnswersError } from "../../../extensions/questionnaire/application/errors.js";
import {
  dispatchQuestionnaireIntent,
  type QuestionnaireIntent,
} from "../../../extensions/questionnaire/presentation/QuestionnaireIntent.js";
import type {
  CancelQuestionnaireFunction,
  DisposeQuestionnaireFunction,
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
  problems: QuestionnaireSubmissionProblemDto[],
): SubmitQuestionnaireFunction {
  return () => ({
    ok: false,
    error: new InvalidQuestionnaireAnswersError(problems),
  });
}

function createCancelSuccess(): CancelQuestionnaireFunction {
  return () => ({
    ok: true,
    value: createSingleSelectQuestionnaire(),
  });
}

function createDisposeSuccess(): DisposeQuestionnaireFunction {
  return () => undefined;
}

describe("dispatchQuestionnaireIntent", () => {
  it("maps navigation and mutation intents to the view model", () => {
    const viewModel = new QuestionnaireViewModel(
      createMultiQuestionQuestionnaire(),
      createAnswerUpdateStub(createMultiQuestionQuestionnaire()),
      createSubmitSuccess(),
      createCancelSuccess(),
      createDisposeSuccess(),
    );

    const intents: QuestionnaireIntent[] = [
      { type: "next" },
      { type: "toggle_option", label: "E2E tests" },
      { type: "set_custom_answer", value: "Load tests" },
      { type: "go_to_question", questionIndex: 0 },
      { type: "select_option", label: "Vue" },
    ];

    intents.forEach((intent) => {
      dispatchQuestionnaireIntent(viewModel, intent);
    });

    expect(viewModel.currentQuestionIndex()).toBe(0);
    expect(viewModel.draftAnswers()).toEqual([
      {
        selections: [{ source: "option", value: "Vue" }],
      },
      {
        selections: [
          { source: "option", value: "E2E tests" },
          { source: "custom", value: "Load tests" },
        ],
      },
    ]);
  });

  it("returns submit and cancel results for those intents", () => {
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
      createDisposeSuccess(),
    );

    const submitResult = dispatchQuestionnaireIntent(viewModel, {
      type: "submit",
    });
    const cancelResult = dispatchQuestionnaireIntent(viewModel, {
      type: "cancel",
    });

    expect(submitResult).toEqual({
      ok: false,
      error: new InvalidQuestionnaireAnswersError([
        {
          questionIndex: 0,
          message: "question at index 0 requires at least one selection",
        },
      ]),
    });
    expect(cancelResult).toEqual({
      ok: true,
      value: createSingleSelectQuestionnaire(),
    });
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
