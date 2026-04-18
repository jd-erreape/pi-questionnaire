import { describe, expect, it } from "vitest";

import type { QuestionnaireDefinition } from "../../../extensions/questionnaire/domain/definition.js";
import {
  Questionnaire,
  QuestionnaireSubmissionError,
} from "../../../extensions/questionnaire/domain/questionnaire.js";

const multiQuestionDefinition: QuestionnaireDefinition = {
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
    {
      header: "Testing",
      question: "Which testing layers should I include?",
      options: [{ label: "Unit tests" }, { label: "Integration tests" }],
      multiSelect: true,
      allowCustom: true,
      required: false,
    },
  ],
};

function createDefinition(
  overrides?: Partial<QuestionnaireDefinition>,
): QuestionnaireDefinition {
  return {
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
    ...overrides,
  };
}

function startQuestionnaire(
  definition: QuestionnaireDefinition = createDefinition(),
): Questionnaire {
  return Questionnaire.start(
    {
      requestID: "req-123",
      sessionID: "session-1",
    },
    definition,
  );
}

describe("Questionnaire", () => {
  it("starts with one empty answer slot per question", () => {
    const questionnaire = startQuestionnaire(multiQuestionDefinition);

    expect(questionnaire.toAnswerState()).toEqual([
      { selections: [] },
      { selections: [] },
    ]);
  });

  it("preserves stable slot order by question index", () => {
    const questionnaire = startQuestionnaire(multiQuestionDefinition);

    expect(questionnaire.toAnswerState()).toHaveLength(
      multiQuestionDefinition.questions.length,
    );
    expect(questionnaire.toAnswerState()[0]).toEqual({ selections: [] });
    expect(questionnaire.toAnswerState()[1]).toEqual({ selections: [] });
  });

  it("selects a single option for a single-select question", () => {
    const questionnaire = startQuestionnaire();

    questionnaire.selectOption(0, "Vue");

    expect(questionnaire.toAnswerState()).toEqual([
      { selections: [{ source: "option", value: "Vue" }] },
    ]);
  });

  it("toggles options for a multi-select question", () => {
    const questionnaire = startQuestionnaire(
      createDefinition({
        questions: [
          {
            header: "Testing",
            question: "Which testing layers should I include?",
            options: [
              { label: "Unit tests" },
              { label: "Integration tests" },
              { label: "E2E tests" },
            ],
            multiSelect: true,
            allowCustom: true,
            required: true,
          },
        ],
      }),
    );

    questionnaire.toggleOption(0, "Unit tests");
    questionnaire.toggleOption(0, "E2E tests");

    expect(questionnaire.toAnswerState()).toEqual([
      {
        selections: [
          { source: "option", value: "Unit tests" },
          { source: "option", value: "E2E tests" },
        ],
      },
    ]);

    questionnaire.toggleOption(0, "Unit tests");

    expect(questionnaire.toAnswerState()).toEqual([
      {
        selections: [{ source: "option", value: "E2E tests" }],
      },
    ]);
  });

  it("sets a custom answer and preserves options for multi-select questions", () => {
    const questionnaire = startQuestionnaire(
      createDefinition({
        questions: [
          {
            header: "Testing",
            question: "Which testing layers should I include?",
            options: [
              { label: "Unit tests" },
              { label: "Integration tests" },
              { label: "E2E tests" },
            ],
            multiSelect: true,
            allowCustom: true,
            required: true,
          },
        ],
      }),
    );

    questionnaire.toggleOption(0, "Unit tests");
    questionnaire.setCustomAnswer(0, "Performance tests");

    expect(questionnaire.toAnswerState()).toEqual([
      {
        selections: [
          { source: "option", value: "Unit tests" },
          { source: "custom", value: "Performance tests" },
        ],
      },
    ]);
  });

  it("clears an answer", () => {
    const questionnaire = startQuestionnaire();

    questionnaire.selectOption(0, "React");
    questionnaire.clearAnswer(0);

    expect(questionnaire.toAnswerState()).toEqual([{ selections: [] }]);
  });

  it("submits a valid single-select answer", () => {
    const questionnaire = startQuestionnaire();
    questionnaire.selectOption(0, "React");

    const result = questionnaire.submit();

    expect(result).toEqual({
      ok: true,
      value: [{ selections: ["React"] }],
    });
  });

  it("submits a valid multi-select answer", () => {
    const questionnaire = startQuestionnaire(
      createDefinition({
        questions: [
          {
            header: "Testing",
            question: "Which testing layers should I include?",
            options: [
              { label: "Unit tests" },
              { label: "Integration tests" },
              { label: "E2E tests" },
            ],
            multiSelect: true,
            allowCustom: true,
            required: true,
          },
        ],
      }),
    );
    questionnaire.toggleOption(0, "Unit tests");
    questionnaire.toggleOption(0, "E2E tests");

    const result = questionnaire.submit();

    expect(result).toEqual({
      ok: true,
      value: [{ selections: ["Unit tests", "E2E tests"] }],
    });
  });

  it("submits an optional skipped question to an empty stable answer slot", () => {
    const questionnaire = startQuestionnaire(
      createDefinition({
        questions: [
          {
            header: "Testing",
            question: "Which testing layers should I include?",
            options: [{ label: "Unit tests" }, { label: "Integration tests" }],
            multiSelect: true,
            allowCustom: true,
            required: false,
          },
        ],
      }),
    );

    const result = questionnaire.submit();

    expect(result).toEqual({
      ok: true,
      value: [{ selections: [] }],
    });
  });

  it("rejects an empty required question", () => {
    const questionnaire = startQuestionnaire();

    const result = questionnaire.submit();

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected submission error");
    }

    expect(result.error).toBeInstanceOf(QuestionnaireSubmissionError);
    expect(result.error.issues).toEqual([
      {
        questionIndex: 0,
        message: "question at index 0 requires at least one selection",
      },
    ]);
  });

  it("rejects custom answers when allowCustom is false", () => {
    const questionnaire = startQuestionnaire(
      createDefinition({
        questions: [
          {
            header: "Framework",
            question: "Which frontend framework should I target?",
            options: [{ label: "React" }, { label: "Vue" }],
            multiSelect: false,
            allowCustom: false,
            required: true,
          },
        ],
      }),
    );
    questionnaire.setCustomAnswer(0, "Svelte");

    const result = questionnaire.submit();

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected submission error");
    }

    expect(result.error).toBeInstanceOf(QuestionnaireSubmissionError);
    expect(result.error.issues).toEqual([
      {
        questionIndex: 0,
        message: "question at index 0 does not allow custom selections",
      },
    ]);
  });

  it("rejects predefined selections not present in the option list", () => {
    const questionnaire = startQuestionnaire();
    questionnaire.selectOption(0, "Svelte");

    const result = questionnaire.submit();

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected submission error");
    }

    expect(result.error).toBeInstanceOf(QuestionnaireSubmissionError);
    expect(result.error.issues).toEqual([
      {
        questionIndex: 0,
        message: 'question at index 0 has invalid option selection: "Svelte"',
      },
    ]);
  });

  it("preserves slot order and selection order", () => {
    const questionnaire = startQuestionnaire(multiQuestionDefinition);
    questionnaire.selectOption(0, "Vue");
    questionnaire.toggleOption(1, "Integration tests");
    questionnaire.setCustomAnswer(1, "Performance tests");
    questionnaire.toggleOption(1, "Unit tests");

    const result = questionnaire.submit();

    expect(result).toEqual({
      ok: true,
      value: [
        { selections: ["Vue"] },
        {
          selections: ["Integration tests", "Performance tests", "Unit tests"],
        },
      ],
    });
  });
});
