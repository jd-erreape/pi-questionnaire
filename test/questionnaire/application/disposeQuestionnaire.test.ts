import { describe, expect, it } from "vitest";

import { disposeQuestionnaire } from "../../../extensions/questionnaire/application/use-cases/disposeQuestionnaire.js";
import { Questionnaire } from "../../../extensions/questionnaire/domain/questionnaire.js";
import { InMemoryActiveQuestionnaireStore } from "../../../extensions/questionnaire/infrastructure/runtime/InMemoryActiveQuestionnaireStore.js";

function createQuestionnaire(options?: {
  requestID?: string;
  sessionID?: string;
}) {
  return Questionnaire.start(
    {
      requestID: options?.requestID ?? "req-123",
      sessionID: options?.sessionID ?? "session-1",
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
}

describe("disposeQuestionnaire", () => {
  it("deletes the matching active questionnaire", () => {
    const store = new InMemoryActiveQuestionnaireStore();
    const questionnaire = createQuestionnaire();
    store.save(questionnaire);

    disposeQuestionnaire(
      {
        sessionID: "session-1",
        requestID: "req-123",
      },
      { activeQuestionnaireStore: store },
    );

    expect(store.get("session-1")).toBeUndefined();
  });

  it("does nothing when there is no active questionnaire", () => {
    const store = new InMemoryActiveQuestionnaireStore();

    expect(() => {
      disposeQuestionnaire(
        {
          sessionID: "session-1",
          requestID: "req-123",
        },
        { activeQuestionnaireStore: store },
      );
    }).not.toThrow();
  });

  it("does not delete a questionnaire owned by another request", () => {
    const store = new InMemoryActiveQuestionnaireStore();
    const questionnaire = createQuestionnaire({ requestID: "req-123" });
    store.save(questionnaire);

    disposeQuestionnaire(
      {
        sessionID: "session-1",
        requestID: "req-999",
      },
      { activeQuestionnaireStore: store },
    );

    expect(store.get("session-1")).toBeDefined();
    expect(store.get("session-1")?.getRequestID()).toBe("req-123");
  });
});
