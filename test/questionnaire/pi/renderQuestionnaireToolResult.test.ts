import { describe, expect, it } from "vitest";

import { renderQuestionnaireToolResult } from "../../../extensions/questionnaire/pi/renderQuestionnaireToolResult.js";

const theme = {
  fg: (_token: string, text: string) => text,
  bold: (text: string) => text,
};

describe("renderQuestionnaireToolResult", () => {
  it("renders padded expanded submitted results with emoji summaries", () => {
    const component = renderQuestionnaireToolResult(
      {
        content: [{ type: "text", text: "Questionnaire submitted." }],
        details: {
          status: "submitted",
          responses: [
            {
              question: "Which frontend framework should I target?",
              selections: ["React"],
            },
          ],
        },
      },
      { expanded: true } as never,
      theme as never,
    );

    const lines = component.render(120);
    const rendered = lines.join("\n");

    expect(lines[0]?.trim()).toBe("");
    expect(lines.at(-1)?.trim()).toBe("");
    expect(rendered).toContain("✅ 1 question answered");
    expect(rendered).toContain(
      "Which frontend framework should I target?: React",
    );
  });

  it("renders padded expanded invalid request failures with emoji heading", () => {
    const component = renderQuestionnaireToolResult(
      {
        content: [{ type: "text", text: "Invalid questionnaire request." }],
        details: {
          status: "failed",
          reason: "invalid_request",
          errors: ["questions must not be empty"],
        },
      },
      { expanded: true } as never,
      theme as never,
    );

    const lines = component.render(120);
    const rendered = lines.join("\n");

    expect(lines[0]?.trim()).toBe("");
    expect(lines.at(-1)?.trim()).toBe("");
    expect(rendered).toContain("❌ Invalid questionnaire request");
    expect(rendered).toContain("• questions must not be empty");
  });

  it("renders padded cancelled results", () => {
    const component = renderQuestionnaireToolResult(
      {
        content: [{ type: "text", text: "Questionnaire cancelled by user." }],
        details: {
          status: "cancelled",
          reason: "user_cancelled",
          questions: [],
        },
      },
      { expanded: false } as never,
      theme as never,
    );

    const lines = component.render(120);
    const rendered = lines.join("\n");

    expect(lines[0]?.trim()).toBe("");
    expect(lines.at(-1)?.trim()).toBe("");
    expect(rendered).toContain("⚠️ Cancelled");
  });

  it("falls back to raw content when structured details are missing", () => {
    const component = renderQuestionnaireToolResult(
      {
        content: [{ type: "text", text: "plain fallback" }],
      } as never,
      { expanded: false } as never,
      theme as never,
    );

    expect(component.render(120).join("\n")).toContain("plain fallback");
  });
});
