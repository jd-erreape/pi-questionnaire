import { describe, expect, it } from "vitest";

import { normalizeQuestionnaireRequest } from "../../../../extensions/questionnaire/application/request/normalizeQuestionnaireRequest.js";

describe("normalizeQuestionnaireRequest", () => {
  it("trims strings, omits empty optional strings, and applies defaults", () => {
    const definition = normalizeQuestionnaireRequest({
      title: "  Implementation preferences  ",
      instructions: "   ",
      questions: [
        {
          header: "  Framework  ",
          question: "  Which frontend framework should I target?  ",
          options: [
            { label: "  React  ", description: "  Component-driven  " },
            { label: "  Vue  ", description: "   " },
          ],
        },
      ],
    });

    expect(definition).toEqual({
      title: "Implementation preferences",
      questions: [
        {
          header: "Framework",
          question: "Which frontend framework should I target?",
          options: [
            { label: "React", description: "Component-driven" },
            { label: "Vue" },
          ],
          multiSelect: false,
          allowCustom: true,
          required: true,
        },
      ],
    });
  });

  it("preserves question and option order", () => {
    const definition = normalizeQuestionnaireRequest({
      questions: [
        {
          header: "Second",
          question: "Second question?",
          options: [{ label: "B" }, { label: "A" }],
          multiSelect: true,
          allowCustom: false,
          required: false,
        },
        {
          header: "First",
          question: "First question?",
          options: [{ label: "Y" }, { label: "X" }],
        },
      ],
    });

    expect(definition.questions.map((question) => question.header)).toEqual([
      "Second",
      "First",
    ]);
    expect(
      definition.questions[0].options.map((option) => option.label),
    ).toEqual(["B", "A"]);
    expect(
      definition.questions[1].options.map((option) => option.label),
    ).toEqual(["Y", "X"]);
  });
});
