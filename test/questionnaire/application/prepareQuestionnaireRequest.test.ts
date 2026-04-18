import { describe, expect, it } from "vitest";

import { prepareQuestionnaireRequest } from "../../../extensions/questionnaire/application/use-cases/prepareQuestionnaireRequest.js";

describe("prepareQuestionnaireRequest", () => {
  it("returns the validated request and normalized definition for valid input", () => {
    const result = prepareQuestionnaireRequest({
      title: "  Implementation preferences  ",
      questions: [
        {
          header: "  Framework  ",
          question: "  Which frontend framework should I target?  ",
          options: [{ label: "  React  " }, { label: "  Vue  " }],
        },
      ],
    });

    expect(result).toEqual({
      ok: true,
      value: {
        title: "Implementation preferences",
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

  it("returns validation issues for invalid input", () => {
    const result = prepareQuestionnaireRequest({});

    expect(result).toEqual({
      ok: false,
      issues: [{ message: "questions is required" }],
    });
  });
});
