import { describe, expect, it } from "vitest";

import { renderQuestionnaireToolCall } from "../../../../extensions/questionnaire/infrastructure/pi/renderQuestionnaireToolCall.js";

const theme = {
  fg: (_token: string, text: string) => text,
  bold: (text: string) => text.toUpperCase(),
};

describe("renderQuestionnaireToolCall", () => {
  it("renders the questionnaire title and question count summary", () => {
    const component = renderQuestionnaireToolCall(
      {
        title: "Implementation preferences",
        questions: [
          {
            header: "Framework",
            question: "Which frontend framework should I target?",
            options: [{ label: "React" }, { label: "Vue" }],
          },
          {
            header: "Testing",
            question: "Which testing layers should I include?",
            options: [{ label: "Unit" }, { label: "E2E" }],
          },
        ],
      },
      theme as never,
    );

    expect(component.render(120).join("\n")).toContain(
      "QUESTIONNAIRE Implementation preferences · 2 questions",
    );
  });

  it("falls back to the default title when none is provided", () => {
    const component = renderQuestionnaireToolCall(
      {
        questions: [
          {
            header: "Framework",
            question: "Which frontend framework should I target?",
            options: [{ label: "React" }, { label: "Vue" }],
          },
        ],
      },
      theme as never,
    );

    expect(component.render(120).join("\n")).toContain(
      "QUESTIONNAIRE Questionnaire · 1 question",
    );
  });
});
