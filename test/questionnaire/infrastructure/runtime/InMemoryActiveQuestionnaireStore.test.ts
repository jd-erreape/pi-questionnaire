import { describe, expect, it } from "vitest";

import { Questionnaire } from "../../../../extensions/questionnaire/domain/questionnaire.js";
import { InMemoryActiveQuestionnaireStore } from "../../../../extensions/questionnaire/infrastructure/runtime/InMemoryActiveQuestionnaireStore.js";

function createQuestionnaire(
  sessionID: string,
  requestID: string,
): Questionnaire {
  return Questionnaire.start(
    {
      requestID,
      sessionID,
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

describe("InMemoryActiveQuestionnaireStore", () => {
  it("saves and retrieves a questionnaire by session ID", () => {
    const store = new InMemoryActiveQuestionnaireStore();
    const questionnaire = createQuestionnaire("session-1", "req-1");

    store.save(questionnaire);

    expect(store.get("session-1")).toEqual(questionnaire);
  });

  it("deletes a questionnaire by session ID", () => {
    const store = new InMemoryActiveQuestionnaireStore();
    const questionnaire = createQuestionnaire("session-1", "req-1");
    store.save(questionnaire);

    store.delete("session-1");

    expect(store.get("session-1")).toBeUndefined();
  });
});
