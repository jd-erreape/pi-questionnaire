import { describe, expect, it } from "vitest";

import { validateQuestionnaireRequest } from "../../../extensions/questionnaire/domain/policies/validateQuestionnaireRequest.js";

function createValidRequest() {
  return {
    title: "Implementation preferences",
    instructions: "Keep answers concise.",
    questions: [
      {
        header: "Framework",
        question: "Which frontend framework should I target?",
        options: [{ label: "React" }, { label: "Vue" }],
      },
    ],
  };
}

describe("validateQuestionnaireRequest", () => {
  it("accepts a minimal valid request", () => {
    const result = validateQuestionnaireRequest({
      questions: [
        {
          header: "Framework",
          question: "Which frontend framework should I target?",
          options: [{ label: "React" }, { label: "Vue" }],
        },
      ],
    });

    expect(result).toEqual({
      ok: true,
      value: {
        questions: [
          {
            header: "Framework",
            question: "Which frontend framework should I target?",
            options: [{ label: "React" }, { label: "Vue" }],
          },
        ],
      },
    });
  });

  it("rejects a missing questions field", () => {
    const result = validateQuestionnaireRequest({});

    expect(result).toEqual({
      ok: false,
      issues: [{ message: "questions is required" }],
    });
  });

  it("rejects too many questions", () => {
    const result = validateQuestionnaireRequest({
      questions: [
        {
          header: "1",
          question: "Q1",
          options: [{ label: "A" }, { label: "B" }],
        },
        {
          header: "2",
          question: "Q2",
          options: [{ label: "A" }, { label: "B" }],
        },
        {
          header: "3",
          question: "Q3",
          options: [{ label: "A" }, { label: "B" }],
        },
        {
          header: "4",
          question: "Q4",
          options: [{ label: "A" }, { label: "B" }],
        },
        {
          header: "5",
          question: "Q5",
          options: [{ label: "A" }, { label: "B" }],
        },
        {
          header: "6",
          question: "Q6",
          options: [{ label: "A" }, { label: "B" }],
        },
      ],
    });

    expect(result).toEqual({
      ok: false,
      issues: [{ message: "questions must contain between 1 and 5 items" }],
    });
  });

  it("rejects unknown top-level fields", () => {
    const result = validateQuestionnaireRequest({
      ...createValidRequest(),
      extra: true,
    });

    expect(result).toEqual({
      ok: false,
      issues: [{ message: "unknown top-level field: extra" }],
    });
  });

  it("rejects unknown question fields", () => {
    const result = validateQuestionnaireRequest({
      questions: [
        {
          header: "Framework",
          question: "Which frontend framework should I target?",
          options: [{ label: "React" }, { label: "Vue" }],
          extra: true,
        },
      ],
    });

    expect(result).toEqual({
      ok: false,
      issues: [{ message: "question at index 0 has unknown field: extra" }],
    });
  });

  it("rejects unknown option fields", () => {
    const result = validateQuestionnaireRequest({
      questions: [
        {
          header: "Framework",
          question: "Which frontend framework should I target?",
          options: [{ label: "React", extra: true }, { label: "Vue" }],
        },
      ],
    });

    expect(result).toEqual({
      ok: false,
      issues: [
        { message: "option at index 0 in question 0 has unknown field: extra" },
      ],
    });
  });

  it("rejects invalid boolean field types", () => {
    const result = validateQuestionnaireRequest({
      questions: [
        {
          header: "Testing",
          question: "Which testing layers should I include?",
          options: [{ label: "Unit tests" }, { label: "Integration tests" }],
          multiSelect: "yes",
        },
      ],
    });

    expect(result).toEqual({
      ok: false,
      issues: [
        { message: "question at index 0 field multiSelect must be a boolean" },
      ],
    });
  });

  it("rejects duplicate option labels after trimming and case-folding", () => {
    const result = validateQuestionnaireRequest({
      questions: [
        {
          header: "Framework",
          question: "Which frontend framework should I target?",
          options: [{ label: "React" }, { label: " react " }],
        },
      ],
    });

    expect(result).toEqual({
      ok: false,
      issues: [
        {
          message:
            'question at index 0 has duplicate option label after trimming and case-folding: "react"',
        },
      ],
    });
  });

  it("rejects empty trimmed required strings", () => {
    const result = validateQuestionnaireRequest({
      questions: [
        {
          header: "   ",
          question: "Which frontend framework should I target?",
          options: [{ label: "React" }, { label: "Vue" }],
        },
      ],
    });

    expect(result).toEqual({
      ok: false,
      issues: [
        { message: "question at index 0 field header must not be empty" },
      ],
    });
  });

  it("rejects too few options", () => {
    const result = validateQuestionnaireRequest({
      questions: [
        {
          header: "Framework",
          question: "Which frontend framework should I target?",
          options: [{ label: "React" }],
        },
      ],
    });

    expect(result).toEqual({
      ok: false,
      issues: [
        {
          message:
            "question at index 0 options must contain between 2 and 5 items",
        },
      ],
    });
  });
});
