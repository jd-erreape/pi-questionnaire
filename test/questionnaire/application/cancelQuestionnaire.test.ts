import { describe, expect, it } from "vitest";

import type { ActiveQuestionnaireStore } from "../../../extensions/questionnaire/application/ports.js";
import { QuestionnaireNotActiveError } from "../../../extensions/questionnaire/application/errors.js";
import { cancelQuestionnaire } from "../../../extensions/questionnaire/application/use-cases/cancelQuestionnaire.js";
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
  );
}

describe("cancelQuestionnaire", () => {
  it("returns questionnaire_not_active when the session does not have a matching active questionnaire", () => {
    const store = new FakeActiveQuestionnaireStore();

    const result = cancelQuestionnaire(
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
      throw new Error("Expected questionnaire not active error");
    }

    expect(result.error).toBeInstanceOf(QuestionnaireNotActiveError);
    if (!(result.error instanceof QuestionnaireNotActiveError)) {
      throw new Error("Expected QuestionnaireNotActiveError");
    }

    expect(result.error.message).toBe("Questionnaire is not active.");
  });

  it("removes the active questionnaire and returns its instance data", () => {
    const store = new FakeActiveQuestionnaireStore();
    const questionnaire = createQuestionnaire();
    questionnaire.selectOption(0, "React");
    store.save(questionnaire);

    const result = cancelQuestionnaire(
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
      },
    });
    expect(store.get("session-1")).toBeUndefined();
  });
});
