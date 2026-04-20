import type { ExtensionContext } from "@mariozechner/pi-coding-agent";
import { describe, expect, it, vi } from "vitest";

import type { SubmittedQuestionnaireDto } from "../../../../extensions/questionnaire/application/dto/questionnaire-submission.js";
import { executeQuestionnaireTool } from "../../../../extensions/questionnaire/pi/tool/executeQuestionnaireTool.js";

function createSubmittedQuestionnaireDto(): SubmittedQuestionnaireDto {
  return {
    questionnaire: {
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
    },
    responses: [
      {
        question: "Which frontend framework should I target?",
        selections: ["React"],
      },
    ],
  };
}

function createContext(options?: {
  hasUI?: boolean;
  sessionFile?: string;
  selectResults?: Array<string | undefined>;
  confirmResult?: boolean;
}) {
  const select = vi.fn(() => Promise.resolve(options?.selectResults?.shift()));

  return {
    ctx: {
      hasUI: options?.hasUI ?? true,
      cwd: "/repo",
      ui: {
        select,
        input: vi.fn(),
        confirm: vi.fn(() => Promise.resolve(options?.confirmResult ?? false)),
        notify: vi.fn(),
      },
      sessionManager: {
        getSessionFile: () => options?.sessionFile,
      },
    } as unknown as ExtensionContext,
    select,
  };
}

describe("executeQuestionnaireTool", () => {
  it("returns invalid_request before opening the UI", async () => {
    const { ctx, select } = createContext();

    const result = await executeQuestionnaireTool({ questions: [] }, ctx);

    expect(select).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      isError: true,
      details: {
        status: "failed",
        reason: "invalid_request",
      },
    });
  });

  it("maps a submitted UI outcome through the infrastructure adapter", async () => {
    const submission = createSubmittedQuestionnaireDto();
    const { ctx, select } = createContext({
      sessionFile: "session-execute-tool",
      selectResults: ["◯ Option: React", "✅ Submit questionnaire"],
    });

    const result = await executeQuestionnaireTool(
      {
        title: "Implementation preferences",
        questions: [
          {
            header: "Framework",
            question: "Which frontend framework should I target?",
            options: [{ label: "React" }, { label: "Vue" }],
          },
        ],
      },
      ctx,
    );

    expect(select).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
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
  });
});
