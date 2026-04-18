import type {
  ExtensionAPI,
  ExtensionContext,
  ToolDefinition,
} from "@mariozechner/pi-coding-agent";
import { describe, expect, it, vi } from "vitest";

import questionnaireExtension from "../../extensions/questionnaire/index.js";
import type { QuestionnaireDto } from "../../extensions/questionnaire/application/dto/questionnaire.js";
import type { SubmittedQuestionnaireDto } from "../../extensions/questionnaire/application/dto/questionnaire-submission.js";

function createRegisteredTool(): ToolDefinition | undefined {
  let registeredTool: ToolDefinition | undefined;

  questionnaireExtension({
    registerTool(tool) {
      registeredTool = tool as unknown as ToolDefinition;
    },
  } as ExtensionAPI);

  return registeredTool;
}

function createContext(options?: {
  hasUI?: boolean;
  sessionFile?: string;
  customResult?: unknown;
}) {
  const custom = vi.fn(() => Promise.resolve(options?.customResult));

  return {
    ctx: {
      hasUI: options?.hasUI ?? true,
      cwd: "/repo",
      ui: {
        custom,
      },
      sessionManager: {
        getSessionFile: () => options?.sessionFile,
      },
    } as unknown as ExtensionContext,
    custom,
  };
}

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
    draftAnswers: [
      {
        selections: [{ source: "option", value: "React" }],
      },
    ],
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

describe("questionnaire extension", () => {
  it("registers the real questionnaire tool with a structured schema", () => {
    const tool = createRegisteredTool();

    expect(tool?.name).toBe("questionnaire");
    expect(tool?.label).toBe("Questionnaire");
    expect(tool?.description).toContain("clarifying requirements");
    expect(tool?.promptSnippet).toContain("small structured questionnaire");
    expect(tool?.promptGuidelines).toEqual(
      expect.arrayContaining([
        expect.stringContaining("1 to 5 focused questions"),
        expect.stringContaining("2 to 5 concise options"),
      ]),
    );
    const parameters = tool?.parameters as {
      type?: string;
      additionalProperties?: boolean;
      properties?: {
        questions?: {
          minItems?: number;
          maxItems?: number;
        };
      };
    };

    expect(parameters.type).toBe("object");
    expect(parameters.additionalProperties).toBe(false);
    expect(parameters.properties?.questions?.minItems).toBe(1);
    expect(parameters.properties?.questions?.maxItems).toBe(5);
  });

  it("returns invalid_request details before opening UI", async () => {
    const tool = createRegisteredTool();
    const { ctx, custom } = createContext();

    const result = await tool!.execute(
      "tool-call-1",
      { questions: [] },
      undefined,
      undefined,
      ctx,
    );

    expect(custom).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      isError: true,
      details: {
        status: "failed",
        reason: "invalid_request",
      },
    });
    expect(result.content[0]).toEqual({
      type: "text",
      text: "Invalid questionnaire request.",
    });
  });

  it("returns interactive_ui_required when Pi has no UI", async () => {
    const tool = createRegisteredTool();
    const { ctx, custom } = createContext({ hasUI: false });

    const result = await tool!.execute(
      "tool-call-1",
      {
        questions: [
          {
            header: "Framework",
            question: "Which frontend framework should I target?",
            options: [{ label: "React" }, { label: "Vue" }],
          },
        ],
      },
      undefined,
      undefined,
      ctx,
    );

    expect(custom).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      isError: true,
      details: {
        status: "failed",
        reason: "interactive_ui_required",
      },
    });
  });

  it("maps a submitted UI outcome to the questionnaire success envelope", async () => {
    const tool = createRegisteredTool();
    const { ctx, custom } = createContext({
      customResult: {
        kind: "submitted",
        result: createSubmittedQuestionnaireDto(),
      },
    });

    const result = await tool!.execute(
      "tool-call-1",
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
      undefined,
      undefined,
      ctx,
    );

    expect(custom).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: [
            "Questionnaire submitted.",
            "Responses:",
            JSON.stringify(
              [
                {
                  question: "Which frontend framework should I target?",
                  selections: ["React"],
                },
              ],
              null,
              2,
            ),
          ].join("\n"),
        },
      ],
      details: {
        status: "submitted",
        responses: [
          {
            question: "Which frontend framework should I target?",
            selections: ["React"],
          },
        ],
      },
    });
  });

  it("maps a cancelled UI outcome to the questionnaire cancelled envelope", async () => {
    const tool = createRegisteredTool();
    const { ctx, custom } = createContext({
      customResult: {
        kind: "cancelled",
        result: createQuestionnaireDto(),
      },
    });

    const result = await tool!.execute(
      "tool-call-1",
      {
        title: "Implementation preferences",
        instructions: "Keep answers concise.",
        questions: [
          {
            header: "Framework",
            question: "Which frontend framework should I target?",
            options: [{ label: "React" }, { label: "Vue" }],
          },
        ],
      },
      undefined,
      undefined,
      ctx,
    );

    expect(custom).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      isError: true,
      content: [{ type: "text", text: "Questionnaire cancelled by user." }],
      details: {
        status: "cancelled",
        reason: "user_cancelled",
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
      },
    });
  });
});
