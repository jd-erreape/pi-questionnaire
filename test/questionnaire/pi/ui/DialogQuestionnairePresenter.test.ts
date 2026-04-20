import type { ExtensionContext } from "@mariozechner/pi-coding-agent";
import { describe, expect, it, vi } from "vitest";

import type {
  QuestionnaireDraftAnswerMutationDto,
  QuestionnaireDraftAnswersDto,
} from "../../../../extensions/questionnaire/application/dto/questionnaire-draft-answers.js";
import { InvalidQuestionnaireAnswersError } from "../../../../extensions/questionnaire/application/errors.js";
import type { QuestionnaireDto } from "../../../../extensions/questionnaire/application/dto/questionnaire.js";
import { DialogQuestionnairePresenter } from "../../../../extensions/questionnaire/pi/ui/DialogQuestionnairePresenter.js";
import { QuestionnaireViewModel } from "../../../../extensions/questionnaire/presentation/QuestionnaireViewModel.js";

function createQuestionnaireDto(): QuestionnaireDto {
  return {
    requestID: "req-123",
    sessionID: "session-1",
    title: "[worker] Example Questionnaire",
    instructions: "Please answer all three questions.",
    questions: [
      {
        header: "Single Response",
        question: "Which option do you prefer?",
        options: [
          { label: "Option A" },
          { label: "Option B" },
          { label: "Option C" },
        ],
        multiSelect: false,
        allowCustom: false,
        required: true,
      },
      {
        header: "Multiple Response",
        question: "Which options apply?",
        options: [{ label: "Fast" }, { label: "Safe" }],
        multiSelect: true,
        allowCustom: false,
        required: true,
      },
      {
        header: "Color",
        question: "Choose a color or enter your own.",
        options: [{ label: "Red" }, { label: "Blue" }],
        multiSelect: false,
        allowCustom: true,
        required: true,
      },
    ],
    draftAnswers: [{ selections: [] }, { selections: [] }, { selections: [] }],
  };
}

function createViewModel() {
  const questionnaire = createQuestionnaireDto();
  let draftAnswers = cloneDraftAnswers(questionnaire.draftAnswers);

  return new QuestionnaireViewModel(
    questionnaire,
    ({ mutation }) => {
      draftAnswers = applyMutation(draftAnswers, mutation);
      return {
        ok: true,
        value: {
          ...questionnaire,
          draftAnswers: cloneDraftAnswers(draftAnswers),
        },
      };
    },
    () => ({
      ok: false,
      error: new InvalidQuestionnaireAnswersError([
        {
          questionIndex: 0,
          message: "question at index 0 requires at least one selection",
        },
        {
          questionIndex: 1,
          message: "question at index 1 requires at least one selection",
        },
        {
          questionIndex: 2,
          message: "question at index 2 requires at least one selection",
        },
      ]),
    }),
    () => ({
      ok: true,
      value: {
        ...questionnaire,
        draftAnswers: cloneDraftAnswers(draftAnswers),
      },
    }),
    () => undefined,
  );
}

describe("DialogQuestionnairePresenter", () => {
  it("renders clearer sectioned prompt text and distinct option/action labels", async () => {
    const presenter = new DialogQuestionnairePresenter();
    const viewModel = createViewModel();
    const promptCapture: { title?: string; labels?: string[] } = {};

    viewModel.submit();

    const ctx = {
      ui: {
        select: vi.fn((title: string, labels: string[]) => {
          promptCapture.title = title;
          promptCapture.labels = labels;
          return Promise.resolve(labels.at(-1));
        }),
        input: vi.fn(),
        confirm: vi.fn(() => Promise.resolve(true)),
        notify: vi.fn(),
      },
    } as unknown as ExtensionContext;

    await presenter.present(ctx, viewModel);

    expect(promptCapture.title).toContain("📝 [worker] Example Questionnaire");
    expect(promptCapture.title).toContain("━━ Question 1 of 3 ━━");
    expect(promptCapture.title).toContain("Single choice · required");
    expect(promptCapture.title).toContain("Current answer");
    expect(promptCapture.title).toContain("• none yet");
    expect(promptCapture.title).toContain("⚠️ Problem");
    expect(promptCapture.title).toContain("Questions");
    expect(promptCapture.title).toContain(
      "→ 1. Which option do you prefer? — current · needs attention",
    );
    expect(promptCapture.title).toContain("Choose an option or action below.");
    expect(promptCapture.labels).toEqual([
      "◯ Option: Option A",
      "◯ Option: Option B",
      "◯ Option: Option C",
      "➡️ Next question",
      "✅ Submit questionnaire",
      "❌ Cancel questionnaire",
    ]);
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
