import { Key } from "@mariozechner/pi-tui";
import { describe, expect, it, vi } from "vitest";

import type {
  QuestionnaireDraftAnswerMutationDto,
  QuestionnaireDraftAnswersDto,
} from "../../../../extensions/questionnaire/application/dto/questionnaire-draft-answers.js";
import type { QuestionnaireSubmissionProblemDto } from "../../../../extensions/questionnaire/application/dto/questionnaire-problems.js";
import type { QuestionnaireDto } from "../../../../extensions/questionnaire/application/dto/questionnaire.js";
import { InvalidQuestionnaireAnswersError } from "../../../../extensions/questionnaire/application/errors.js";
import { QuestionnaireComponent } from "../../../../extensions/questionnaire/pi/ui/QuestionnaireComponent.js";
import type { QuestionnaireComponentDone } from "../../../../extensions/questionnaire/pi/ui/questionnaire-ui.js";
import type {
  CancelQuestionnaireFunction,
  DisposeQuestionnaireFunction,
  SubmitQuestionnaireFunction,
  UpdateQuestionnaireAnswerFunction,
} from "../../../../extensions/questionnaire/presentation/QuestionnaireViewModel.js";
import { QuestionnaireViewModel } from "../../../../extensions/questionnaire/presentation/QuestionnaireViewModel.js";

function createSingleSelectQuestionnaire(): QuestionnaireDto {
  return {
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
    draftAnswers: [{ selections: [] }],
  };
}

function createMultiQuestionQuestionnaire(): QuestionnaireDto {
  return {
    requestID: "req-123",
    sessionID: "session-1",
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
    draftAnswers: [{ selections: [] }, { selections: [] }],
  };
}

function createAnswerUpdateStub(
  initialQuestionnaire: QuestionnaireDto,
): UpdateQuestionnaireAnswerFunction {
  let draftAnswers = cloneDraftAnswers(initialQuestionnaire.draftAnswers);

  return ({ mutation }) => {
    draftAnswers = applyMutation(draftAnswers, mutation);
    return {
      ok: true,
      value: {
        ...initialQuestionnaire,
        draftAnswers: cloneDraftAnswers(draftAnswers),
      },
    };
  };
}

function createSubmitSuccess(): SubmitQuestionnaireFunction {
  return () => ({
    ok: true,
    value: {
      questionnaire: {
        ...createSingleSelectQuestionnaire(),
        draftAnswers: [
          {
            selections: [{ source: "option", value: "React" }],
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
}

function createSubmitFailure(
  problems: QuestionnaireSubmissionProblemDto[],
): SubmitQuestionnaireFunction {
  return () => ({
    ok: false,
    error: new InvalidQuestionnaireAnswersError(problems),
  });
}

function createCancelSuccess(
  questionnaire: QuestionnaireDto,
): CancelQuestionnaireFunction {
  return () => ({
    ok: true,
    value: questionnaire,
  });
}

function createDisposeSuccess(): DisposeQuestionnaireFunction {
  return () => undefined;
}

function createViewModel(options?: {
  questionnaire?: QuestionnaireDto;
  submit?: SubmitQuestionnaireFunction;
}) {
  const questionnaire =
    options?.questionnaire ?? createSingleSelectQuestionnaire();

  return new QuestionnaireViewModel(
    questionnaire,
    createAnswerUpdateStub(questionnaire),
    options?.submit ?? createSubmitSuccess(),
    createCancelSuccess(questionnaire),
    createDisposeSuccess(),
  );
}

function createComponent(viewModel: QuestionnaireViewModel) {
  const done = vi.fn<QuestionnaireComponentDone>();
  const tui = { requestRender: vi.fn() };
  const theme = {
    fg: (_token: string, text: string) => text,
    bold: (text: string) => text,
  };

  const component = new QuestionnaireComponent({
    tui: tui as never,
    theme: theme as never,
    viewModel,
    done,
  });

  return { component, done, tui };
}

describe("QuestionnaireComponent", () => {
  it("renders questionnaire context and current question", () => {
    const { component } = createComponent(createViewModel());

    const lines = component.render(80).join("\n");

    expect(lines).toContain("Implementation preferences");
    expect(lines).toContain("Which frontend framework should I target?");
    expect(lines).toContain("React");
    expect(lines).toContain("Submit");
  });

  it("keeps the UI open and shows submission problems when submit is invalid", () => {
    const viewModel = createViewModel({
      submit: createSubmitFailure([
        {
          questionIndex: 0,
          message: "question at index 0 requires at least one selection",
        },
      ]),
    });
    const { component, done } = createComponent(viewModel);

    component.handleInput?.("s");

    expect(done).not.toHaveBeenCalled();
    expect(component.render(80).join("\n")).toContain(
      "question at index 0 requires at least one selection",
    );
  });

  it("submits the focused questionnaire after selecting an option", () => {
    const { component, done } = createComponent(createViewModel());

    component.handleInput?.("\r");
    component.handleInput?.("s");

    expect(done).toHaveBeenCalledWith({
      kind: "submitted",
      result: {
        questionnaire: {
          ...createSingleSelectQuestionnaire(),
          draftAnswers: [
            {
              selections: [{ source: "option", value: "React" }],
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
  });

  it("supports navigation to the next question through keyboard intent mapping", () => {
    const { component } = createComponent(
      createViewModel({ questionnaire: createMultiQuestionQuestionnaire() }),
    );

    component.handleInput?.("\x1b[C");

    expect(component.render(80).join("\n")).toContain(
      "Which testing layers should I include?",
    );
  });

  it("captures a custom answer in component-local edit mode before submission", () => {
    const { component, done } = createComponent(createViewModel());

    component.handleInput?.("\x1b[B");
    component.handleInput?.("\x1b[B");
    component.handleInput?.("\r");
    component.handleInput?.("N");
    component.handleInput?.("o");
    component.handleInput?.("d");
    component.handleInput?.("e");
    component.handleInput?.("\r");
    component.handleInput?.("s");

    expect(done).toHaveBeenCalledWith({
      kind: "submitted",
      result: {
        questionnaire: {
          ...createSingleSelectQuestionnaire(),
          draftAnswers: [
            {
              selections: [{ source: "option", value: "React" }],
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
    expect(component.render(80).join("\n")).toContain("Node");
  });

  it("cancels the questionnaire from the top-level keyboard flow", () => {
    const questionnaire = createSingleSelectQuestionnaire();
    const viewModel = new QuestionnaireViewModel(
      questionnaire,
      createAnswerUpdateStub(questionnaire),
      createSubmitSuccess(),
      createCancelSuccess(questionnaire),
      createDisposeSuccess(),
    );
    const { component, done } = createComponent(viewModel);

    component.handleInput?.("\x1b");

    expect(done).toHaveBeenCalledWith({
      kind: "cancelled",
      result: questionnaire,
    });
  });

  it("accepts common navigation key constants", () => {
    const { component } = createComponent(createViewModel());

    expect(() => {
      component.handleInput?.("\x1b[B");
      component.handleInput?.("\x1b[A");
      component.handleInput?.("\x7f");
      component.handleInput?.("\t");
      component.handleInput?.("\x1b[Z");
      component.handleInput?.(Key.right);
    }).not.toThrow();
  });
});

function applyMutation(
  draftAnswers: QuestionnaireDraftAnswersDto,
  mutation: QuestionnaireDraftAnswerMutationDto,
): QuestionnaireDraftAnswersDto {
  const next = cloneDraftAnswers(draftAnswers);
  const slot = next[mutation.questionIndex];

  if (!slot) {
    return next;
  }

  switch (mutation.type) {
    case "select_option":
      slot.selections = [{ source: "option", value: mutation.label }];
      return next;
    case "toggle_option": {
      const existingIndex = slot.selections.findIndex(
        (selection) =>
          selection.source === "option" && selection.value === mutation.label,
      );

      if (existingIndex >= 0) {
        slot.selections = slot.selections.filter(
          (_, index) => index !== existingIndex,
        );
        return next;
      }

      slot.selections = [
        ...slot.selections,
        { source: "option", value: mutation.label },
      ];
      return next;
    }
    case "set_custom_answer": {
      const optionSelections = slot.selections.filter(
        (selection) => selection.source === "option",
      );

      slot.selections = [
        ...optionSelections,
        { source: "custom", value: mutation.value },
      ];
      return next;
    }
    case "clear_answer":
      slot.selections = [];
      return next;
  }
}

function cloneDraftAnswers(
  draftAnswers: QuestionnaireDraftAnswersDto,
): QuestionnaireDraftAnswersDto {
  return draftAnswers.map((slot) => ({
    selections: slot.selections.map((selection) => ({ ...selection })),
  }));
}
