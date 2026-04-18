import { describe, expect, it } from "vitest";

import type {
  ActiveQuestionnaireStore,
  IdGenerator,
} from "../../../extensions/questionnaire/application/ports.js";
import { startQuestionnaire } from "../../../extensions/questionnaire/application/use-cases/startQuestionnaire.js";
import type { QuestionnaireInstance } from "../../../extensions/questionnaire/domain/instance.js";

class FakeIdGenerator implements IdGenerator {
  constructor(private readonly requestID: string) {}

  nextRequestID(): string {
    return this.requestID;
  }
}

class FakeActiveQuestionnaireStore implements ActiveQuestionnaireStore {
  readonly instances = new Map<string, QuestionnaireInstance>();

  get(sessionID: string): QuestionnaireInstance | undefined {
    return this.instances.get(sessionID);
  }

  save(instance: QuestionnaireInstance): void {
    this.instances.set(instance.metadata.sessionID, instance);
  }

  delete(sessionID: string): void {
    this.instances.delete(sessionID);
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

    expect(result).toEqual({
      ok: false,
      failure: {
        kind: "invalid_request",
        issues: [{ message: "questions is required" }],
      },
    });
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

    expect(result).toEqual({
      ok: false,
      failure: {
        kind: "interactive_ui_required",
      },
    });
    expect(store.get("session-1")).toBeUndefined();
  });

  it("returns questionnaire_already_active when the session already has one", () => {
    const store = new FakeActiveQuestionnaireStore();
    const existingInstance: QuestionnaireInstance = {
      metadata: {
        requestID: "req-existing",
        sessionID: "session-1",
      },
      definition: {
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
    };
    store.save(existingInstance);

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

    expect(result).toEqual({
      ok: false,
      failure: {
        kind: "questionnaire_already_active",
      },
    });
    expect(store.get("session-1")).toEqual(existingInstance);
  });

  it("creates and stores a questionnaire instance for a valid interactive request", () => {
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
        metadata: {
          requestID: "req-123",
          sessionID: "session-1",
        },
        definition: {
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
      },
    });
    expect(store.get("session-1")).toEqual(
      result.ok ? result.value : undefined,
    );
  });
});
