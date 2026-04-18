import { describe, expect, it } from "vitest";

import { InMemoryActiveQuestionnaireStore } from "../../../extensions/questionnaire/infrastructure/runtime/InMemoryActiveQuestionnaireStore.js";
import type { QuestionnaireInstance } from "../../../extensions/questionnaire/domain/instance.js";

function createInstance(
  sessionID: string,
  requestID: string,
): QuestionnaireInstance {
  return {
    metadata: {
      requestID,
      sessionID,
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
}

describe("InMemoryActiveQuestionnaireStore", () => {
  it("saves and retrieves an instance by session ID", () => {
    const store = new InMemoryActiveQuestionnaireStore();
    const instance = createInstance("session-1", "req-1");

    store.save(instance);

    expect(store.get("session-1")).toEqual(instance);
  });

  it("deletes an instance by session ID", () => {
    const store = new InMemoryActiveQuestionnaireStore();
    const instance = createInstance("session-1", "req-1");
    store.save(instance);

    store.delete("session-1");

    expect(store.get("session-1")).toBeUndefined();
  });
});
