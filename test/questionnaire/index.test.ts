import type {
  ExtensionAPI,
  ExtensionContext,
  ToolDefinition,
} from "@mariozechner/pi-coding-agent";
import { describe, expect, it, vi } from "vitest";

import questionnaireExtension from "../../extensions/questionnaire/index.js";

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
  selectResults?: Array<string | undefined>;
  selectError?: Error;
  confirmResult?: boolean;
}) {
  const select = vi.fn(() => {
    if (options?.selectError) {
      return Promise.reject(options.selectError);
    }

    return Promise.resolve(options?.selectResults?.shift());
  });

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
    const { ctx, select } = createContext();

    const result = await tool!.execute(
      "tool-call-1",
      { questions: [] },
      undefined,
      undefined,
      ctx,
    );

    expect(select).not.toHaveBeenCalled();
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
    const { ctx, select } = createContext({ hasUI: false });

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

    expect(select).not.toHaveBeenCalled();
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
    const { ctx, select } = createContext({
      selectResults: ["◯ Option: React", "✅ Submit questionnaire"],
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

    expect(select).toHaveBeenCalledTimes(2);
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

  it("cleans up the active questionnaire when the UI throws", async () => {
    const tool = createRegisteredTool();
    const { ctx: failingCtx } = createContext({
      sessionFile: "session-a",
      selectError: new Error("UI crashed"),
    });

    await expect(
      tool!.execute(
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
        failingCtx,
      ),
    ).rejects.toThrow("UI crashed");

    const { ctx: retryCtx, select: retrySelect } = createContext({
      sessionFile: "session-a",
      selectResults: ["❌ Cancel questionnaire"],
      confirmResult: true,
    });

    const result = await tool!.execute(
      "tool-call-2",
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
      retryCtx,
    );

    expect(retrySelect).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      isError: true,
      details: {
        status: "cancelled",
        reason: "user_cancelled",
      },
    });
  });

  it("maps a cancelled UI outcome to the questionnaire cancelled envelope", async () => {
    const tool = createRegisteredTool();
    const { ctx, select } = createContext({
      selectResults: ["❌ Cancel questionnaire"],
      confirmResult: true,
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

    expect(select).toHaveBeenCalledTimes(1);
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
