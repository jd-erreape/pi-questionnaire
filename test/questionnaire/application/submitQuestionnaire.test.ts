import { describe, expect, it } from "vitest";

import type { ActiveQuestionnaireStore } from "../../../extensions/questionnaire/application/ports.js";
import { InvalidQuestionnaireAnswersError } from "../../../extensions/questionnaire/application/errors.js";
import { submitQuestionnaire } from "../../../extensions/questionnaire/application/use-cases/submitQuestionnaire.js";
import { Questionnaire } from "../../../extensions/questionnaire/domain/questionnaire.js";

class FakeActiveQuestionnaireStore implements ActiveQuestionnaireStore {
  readonly questionnaires = new Map<string, Questionnaire>();

  get(sessionID: string): Questionnaire | undefined {
    return this.questionnaires.get(sessionID);
  }

  save(questionnaire: Questionnaire): void {
    this.questionnaires.set(questionnaire.getSessionID(), questionnaire);
  }

  delete(sessionID: string): void {
    this.questionnaires.delete(sessionID);
  }
}

function createQuestionnaire(): Questionnaire {
  return Questionnaire.start(
    {
      requestID: "req-123",
      sessionID: "session-1",
    },
    {
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
  );
}

describe("submitQuestionnaire", () => {
  it("returns invalid_answers with issues when submission fails and keeps the questionnaire active", () => {
    const store = new FakeActiveQuestionnaireStore();
    store.save(createQuestionnaire());

    const result = submitQuestionnaire(
      {
        sessionID: "session-1",
        requestID: "req-123",
      },
      {
        activeQuestionnaireStore: store,
      },
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected invalid answers error");
    }

    expect(result.error).toBeInstanceOf(InvalidQuestionnaireAnswersError);
    if (!(result.error instanceof InvalidQuestionnaireAnswersError)) {
      throw new Error("Expected InvalidQuestionnaireAnswersError");
    }

    expect(result.error.issues).toEqual([
      {
        questionIndex: 0,
        message: "question at index 0 requires at least one selection",
      },
    ]);
    expect(store.get("session-1")).toBeDefined();
  });

  it("returns the instance and submitted responses when submission succeeds", () => {
    const store = new FakeActiveQuestionnaireStore();
    const questionnaire = createQuestionnaire();
    questionnaire.selectOption(0, "React");
    store.save(questionnaire);

    const result = submitQuestionnaire(
      {
        sessionID: "session-1",
        requestID: "req-123",
      },
      {
        activeQuestionnaireStore: store,
      },
    );

    expect(result).toEqual({
      ok: true,
      value: {
        instance: {
          requestID: "req-123",
          sessionID: "session-1",
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
        responses: [
          {
            question: "Which frontend framework should I target?",
            selections: ["React"],
          },
        ],
      },
    });
    expect(store.get("session-1")).toBeUndefined();
  });

  it("uses the stored questionnaire definition when validating answers", () => {
    const store = new FakeActiveQuestionnaireStore();
    const questionnaire = Questionnaire.start(
      {
        requestID: "req-123",
        sessionID: "session-1",
      },
      {
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
      },
    );
    questionnaire.setCustomAnswer(0, "Svelte");
    store.save(questionnaire);

    const result = submitQuestionnaire(
      {
        sessionID: "session-1",
        requestID: "req-123",
      },
      {
        activeQuestionnaireStore: store,
      },
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected invalid answers error");
    }

    expect(result.error).toBeInstanceOf(InvalidQuestionnaireAnswersError);
    if (!(result.error instanceof InvalidQuestionnaireAnswersError)) {
      throw new Error("Expected InvalidQuestionnaireAnswersError");
    }

    expect(result.error.issues).toEqual([
      {
        questionIndex: 0,
        message: "question at index 0 does not allow custom selections",
      },
    ]);
  });
});
