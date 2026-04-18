import { describe, expect, it } from "vitest";

import type {
  ActiveQuestionnaireStore,
  IdGenerator,
} from "../../../extensions/questionnaire/application/ports.js";
import {
  InteractiveUIRequiredError,
  InvalidQuestionnaireRequestError,
  QuestionnaireAlreadyActiveError,
} from "../../../extensions/questionnaire/application/errors.js";
import { startQuestionnaire } from "../../../extensions/questionnaire/application/use-cases/startQuestionnaire.js";
import { Questionnaire } from "../../../extensions/questionnaire/domain/questionnaire.js";

class FakeIdGenerator implements IdGenerator {
  constructor(private readonly requestID: string) {}

  nextRequestID(): string {
    return this.requestID;
  }
}

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

function createValidInput() {
  return {
    title: "  Implementation preferences  ",
    questions: [
      {
        header: "  Framework  ",
        question: "  Which frontend framework should I target?  ",
        options: [{ label: "  React  " }, { label: "  Vue  " }],
      },
    ],
  };
}

describe("startQuestionnaire", () => {
  it("returns invalid_request with issues for invalid input", () => {
    const store = new FakeActiveQuestionnaireStore();
    const idGenerator = new FakeIdGenerator("req-123");

    const result = startQuestionnaire(
      {
        input: {},
        sessionID: "session-1",
        hasInteractiveUI: true,
      },
      {
        activeQuestionnaireStore: store,
        idGenerator,
      },
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected invalid request error");
    }

    expect(result.error).toBeInstanceOf(InvalidQuestionnaireRequestError);
    if (!(result.error instanceof InvalidQuestionnaireRequestError)) {
      throw new Error("Expected InvalidQuestionnaireRequestError");
    }

    expect(result.error.message).toBe("Invalid questionnaire request.");
    expect(result.error.issues).toEqual([{ message: "questions is required" }]);
    expect(store.get("session-1")).toBeUndefined();
  });

  it("returns interactive_ui_required when interactive UI is unavailable", () => {
    const store = new FakeActiveQuestionnaireStore();
    const idGenerator = new FakeIdGenerator("req-123");

    const result = startQuestionnaire(
      {
        input: createValidInput(),
        sessionID: "session-1",
        hasInteractiveUI: false,
      },
      {
        activeQuestionnaireStore: store,
        idGenerator,
      },
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected interactive UI required error");
    }

    expect(result.error).toBeInstanceOf(InteractiveUIRequiredError);
    if (!(result.error instanceof InteractiveUIRequiredError)) {
      throw new Error("Expected InteractiveUIRequiredError");
    }

    expect(result.error.message).toBe(
      "questionnaire requires interactive UI support.",
    );
    expect(store.get("session-1")).toBeUndefined();
  });

  it("returns questionnaire_already_active when the session already has one", () => {
    const store = new FakeActiveQuestionnaireStore();
    const existingQuestionnaire = Questionnaire.start(
      {
        requestID: "req-existing",
        sessionID: "session-1",
      },
      {
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
    store.save(existingQuestionnaire);

    const result = startQuestionnaire(
      {
        input: createValidInput(),
        sessionID: "session-1",
        hasInteractiveUI: true,
      },
      {
        activeQuestionnaireStore: store,
        idGenerator: new FakeIdGenerator("req-123"),
      },
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected questionnaire already active error");
    }

    expect(result.error).toBeInstanceOf(QuestionnaireAlreadyActiveError);
    if (!(result.error instanceof QuestionnaireAlreadyActiveError)) {
      throw new Error("Expected QuestionnaireAlreadyActiveError");
    }

    expect(result.error.message).toBe(
      "Another questionnaire is already active for this session.",
    );
    expect(store.get("session-1")).toEqual(existingQuestionnaire);
  });

  it("creates and stores a normalized questionnaire for a valid interactive request", () => {
    const store = new FakeActiveQuestionnaireStore();
    const idGenerator = new FakeIdGenerator("req-123");

    const result = startQuestionnaire(
      {
        input: createValidInput(),
        sessionID: "session-1",
        hasInteractiveUI: true,
      },
      {
        activeQuestionnaireStore: store,
        idGenerator,
      },
    );

    expect(result).toEqual({
      ok: true,
      value: {
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
    });
    expect(store.get("session-1")).toEqual(
      Questionnaire.start(
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
      ),
    );
  });
});
