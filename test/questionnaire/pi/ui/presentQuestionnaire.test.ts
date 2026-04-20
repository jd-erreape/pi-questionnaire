import type { ExtensionContext } from "@mariozechner/pi-coding-agent";
import { describe, expect, it, vi } from "vitest";

import type {
  QuestionnaireDraftAnswerMutationDto,
  QuestionnaireDraftAnswersDto,
} from "../../../../extensions/questionnaire/application/dto/questionnaire-draft-answers.js";
import { InvalidQuestionnaireAnswersError } from "../../../../extensions/questionnaire/application/errors.js";
import type { QuestionnaireDto } from "../../../../extensions/questionnaire/application/dto/questionnaire.js";
import { QuestionnaireViewModel } from "../../../../extensions/questionnaire/presentation/QuestionnaireViewModel.js";
import { QuestionnaireComponent } from "../../../../extensions/questionnaire/pi/ui/QuestionnaireComponent.js";
import { presentQuestionnaire } from "../../../../extensions/questionnaire/pi/ui/presentQuestionnaire.js";
import type { QuestionnaireUiOutcome } from "../../../../extensions/questionnaire/pi/ui/questionnaire-ui.js";

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
    draftAnswers: [{ selections: [] }],
  };
}

type QuestionnaireUiFactory = (
  tui: { requestRender(): void },
  theme: {
    fg(token: string, text: string): string;
    bold(text: string): string;
  },
  keybindings: unknown,
  done: (result: QuestionnaireUiOutcome) => void,
) => QuestionnaireComponent | Promise<QuestionnaireComponent>;

function createViewModel(
  disposeCalls: Array<{ sessionID: string; requestID: string }>,
) {
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
    () => {
      const selections = draftAnswers[0]?.selections ?? [];

      if (selections.length === 0) {
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
          questionnaire: {
            ...questionnaire,
            draftAnswers: cloneDraftAnswers(draftAnswers),
          },
          responses: [
            {
              question: "Which frontend framework should I target?",
              selections: selections.map((selection) => selection.value),
            },
          ],
        },
      };
    },
    () => ({
      ok: true,
      value: {
        ...questionnaire,
        draftAnswers: cloneDraftAnswers(draftAnswers),
      },
    }),
    (command) => {
      disposeCalls.push(command);
    },
  );
}

describe("presentQuestionnaire", () => {
  it("uses the custom presenter when custom UI is available", async () => {
    const disposeCalls: Array<{ sessionID: string; requestID: string }> = [];
    const outcome: QuestionnaireUiOutcome = {
      kind: "cancelled",
      result: createQuestionnaireDto(),
    };
    const custom = vi.fn((factory: QuestionnaireUiFactory) => {
      const component = factory(
        { requestRender: vi.fn() },
        {
          fg: (_token: string, text: string) => text,
          bold: (text: string) => text,
        },
        undefined,
        vi.fn(),
      );

      expect(component).toBeInstanceOf(QuestionnaireComponent);
      return Promise.resolve(outcome);
    });
    const select = vi.fn();
    const ctx = {
      ui: {
        custom,
        select,
        input: vi.fn(),
        confirm: vi.fn(),
        notify: vi.fn(),
      },
    } as unknown as ExtensionContext;

    const result = await presentQuestionnaire(
      ctx,
      createViewModel(disposeCalls),
    );

    expect(result).toEqual(outcome);
    expect(custom).toHaveBeenCalledTimes(1);
    expect(select).not.toHaveBeenCalled();
    expect(disposeCalls).toEqual([
      { sessionID: "session-1", requestID: "req-123" },
    ]);
  });

  it("falls back to dialog UI when custom UI is unsupported", async () => {
    const disposeCalls: Array<{ sessionID: string; requestID: string }> = [];
    const select = vi
      .fn()
      .mockResolvedValueOnce("◯ Option: React")
      .mockResolvedValueOnce("✅ Submit questionnaire");
    const ctx = {
      ui: {
        custom: vi.fn(() => Promise.resolve(undefined)),
        select,
        input: vi.fn(),
        confirm: vi.fn(),
        notify: vi.fn(),
      },
    } as unknown as ExtensionContext;

    const result = await presentQuestionnaire(
      ctx,
      createViewModel(disposeCalls),
    );

    expect(result).toEqual({
      kind: "submitted",
      result: {
        questionnaire: {
          ...createQuestionnaireDto(),
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
    expect(select).toHaveBeenCalledTimes(2);
    expect(disposeCalls).toEqual([
      { sessionID: "session-1", requestID: "req-123" },
    ]);
  });

  it("disposes the view model even when the custom presenter throws", async () => {
    const disposeCalls: Array<{ sessionID: string; requestID: string }> = [];
    const ctx = {
      ui: {
        custom: vi.fn(() => Promise.reject(new Error("UI crashed"))),
        select: vi.fn(),
        input: vi.fn(),
        confirm: vi.fn(),
        notify: vi.fn(),
      },
    } as unknown as ExtensionContext;

    await expect(
      presentQuestionnaire(ctx, createViewModel(disposeCalls)),
    ).rejects.toThrow("UI crashed");
    expect(disposeCalls).toEqual([
      { sessionID: "session-1", requestID: "req-123" },
    ]);
  });

  it("disposes the view model even when the dialog presenter throws", async () => {
    const disposeCalls: Array<{ sessionID: string; requestID: string }> = [];
    const ctx = {
      ui: {
        select: vi.fn(() => Promise.reject(new Error("Dialog UI crashed"))),
        input: vi.fn(),
        confirm: vi.fn(),
        notify: vi.fn(),
      },
    } as unknown as ExtensionContext;

    await expect(
      presentQuestionnaire(ctx, createViewModel(disposeCalls)),
    ).rejects.toThrow("Dialog UI crashed");
    expect(disposeCalls).toEqual([
      { sessionID: "session-1", requestID: "req-123" },
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
