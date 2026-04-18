import { describe, expect, it } from "vitest";

import type { ActiveQuestionnaireStore } from "../../../extensions/questionnaire/application/ports.js";
import type { QuestionnaireDraftAnswerMutationDto } from "../../../extensions/questionnaire/application/dto/questionnaire-draft-answers.js";
import { updateQuestionnaireAnswer } from "../../../extensions/questionnaire/application/use-cases/updateQuestionnaireAnswer.js";
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

function createSingleSelectQuestionnaire(): Questionnaire {
  return Questionnaire.start(
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
          allowCustom: true,
          required: true,
        },
      ],
    },
  );
}

function createMultiSelectQuestionnaire(): Questionnaire {
  return Questionnaire.start(
    {
      requestID: "req-123",
      sessionID: "session-1",
    },
    {
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
          required: false,
        },
      ],
    },
  );
}

function applyMutation(
  store: FakeActiveQuestionnaireStore,
  mutation: QuestionnaireDraftAnswerMutationDto,
) {
  return updateQuestionnaireAnswer(
    {
      sessionID: "session-1",
      requestID: "req-123",
      mutation,
    },
    {
      activeQuestionnaireStore: store,
    },
  );
}

describe("updateQuestionnaireAnswer", () => {
  it("selects an option for a single-select question and persists it in the store", () => {
    const store = new FakeActiveQuestionnaireStore();
    store.save(createSingleSelectQuestionnaire());

    const result = applyMutation(store, {
      type: "select_option",
      questionIndex: 0,
      label: "Vue",
    });

    expect(result).toEqual({
      ok: true,
      value: [
        {
          selections: [{ source: "option", value: "Vue" }],
        },
      ],
    });
    expect(store.get("session-1")?.toAnswerState()).toEqual([
      {
        selections: [{ source: "option", value: "Vue" }],
      },
    ]);
  });

  it("toggles options for a multi-select question using the stored aggregate", () => {
    const store = new FakeActiveQuestionnaireStore();
    store.save(createMultiSelectQuestionnaire());

    applyMutation(store, {
      type: "toggle_option",
      questionIndex: 0,
      label: "Unit tests",
    });
    applyMutation(store, {
      type: "toggle_option",
      questionIndex: 0,
      label: "E2E tests",
    });
    const result = applyMutation(store, {
      type: "toggle_option",
      questionIndex: 0,
      label: "Unit tests",
    });

    expect(result).toEqual({
      ok: true,
      value: [
        {
          selections: [{ source: "option", value: "E2E tests" }],
        },
      ],
    });
  });

  it("sets a custom answer and preserves options for multi-select questions", () => {
    const store = new FakeActiveQuestionnaireStore();
    store.save(createMultiSelectQuestionnaire());

    applyMutation(store, {
      type: "toggle_option",
      questionIndex: 0,
      label: "Unit tests",
    });
    const result = applyMutation(store, {
      type: "set_custom_answer",
      questionIndex: 0,
      value: "Performance tests",
    });

    expect(result).toEqual({
      ok: true,
      value: [
        {
          selections: [
            { source: "option", value: "Unit tests" },
            { source: "custom", value: "Performance tests" },
          ],
        },
      ],
    });
  });

  it("clears an answer from the stored aggregate", () => {
    const store = new FakeActiveQuestionnaireStore();
    const questionnaire = createSingleSelectQuestionnaire();
    questionnaire.selectOption(0, "React");
    store.save(questionnaire);

    const result = applyMutation(store, {
      type: "clear_answer",
      questionIndex: 0,
    });

    expect(result).toEqual({
      ok: true,
      value: [{ selections: [] }],
    });
  });
});
