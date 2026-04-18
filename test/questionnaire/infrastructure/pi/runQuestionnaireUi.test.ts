import type { ExtensionContext } from "@mariozechner/pi-coding-agent";
import { describe, expect, it, vi } from "vitest";

import type { QuestionnaireDto } from "../../../../extensions/questionnaire/application/dto/questionnaire.js";
import {
  QuestionnaireComponent,
  type QuestionnaireUiOutcome,
} from "../../../../extensions/questionnaire/presentation/QuestionnaireComponent.js";
import { QuestionnaireViewModel } from "../../../../extensions/questionnaire/presentation/QuestionnaireViewModel.js";
import { runQuestionnaireUi } from "../../../../extensions/questionnaire/infrastructure/pi/runQuestionnaireUi.js";

function createQuestionnaireDto(): QuestionnaireDto {
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

  return new QuestionnaireViewModel(
    questionnaire,
    () => ({ ok: true, value: questionnaire }),
    () => ({
      ok: true,
      value: {
        questionnaire,
        responses: [],
      },
    }),
    () => ({ ok: true, value: questionnaire }),
    (command) => {
      disposeCalls.push(command);
    },
  );
}

describe("runQuestionnaireUi", () => {
  it("creates a questionnaire component and returns the UI outcome", async () => {
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
    const ctx = {
      ui: { custom },
    } as unknown as ExtensionContext;

    const result = await runQuestionnaireUi(ctx, createViewModel(disposeCalls));

    expect(result).toEqual(outcome);
    expect(custom).toHaveBeenCalledTimes(1);
    expect(disposeCalls).toEqual([
      { sessionID: "session-1", requestID: "req-123" },
    ]);
  });

  it("disposes the view model even when the UI throws", async () => {
    const disposeCalls: Array<{ sessionID: string; requestID: string }> = [];
    const ctx = {
      ui: {
        custom: vi.fn(() => Promise.reject(new Error("UI crashed"))),
      },
    } as unknown as ExtensionContext;

    await expect(
      runQuestionnaireUi(ctx, createViewModel(disposeCalls)),
    ).rejects.toThrow("UI crashed");
    expect(disposeCalls).toEqual([
      { sessionID: "session-1", requestID: "req-123" },
    ]);
  });
});
