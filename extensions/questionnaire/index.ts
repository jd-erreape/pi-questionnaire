import type {
  AgentToolResult,
  ExtensionAPI,
  ExtensionContext,
  Theme,
  ToolDefinition,
  ToolRenderResultOptions,
} from "@mariozechner/pi-coding-agent";
import { Text } from "@mariozechner/pi-tui";
import { Type } from "@sinclair/typebox";

import type { QuestionnaireDto } from "./application/dto/questionnaire.js";
import type { SubmittedQuestionnaireDto } from "./application/dto/questionnaire-submission.js";
import {
  InteractiveUIRequiredError,
  InvalidQuestionnaireRequestError,
  QuestionnaireAlreadyActiveError,
} from "./application/errors.js";
import { cancelQuestionnaire } from "./application/use-cases/cancelQuestionnaire.js";
import { startQuestionnaire } from "./application/use-cases/startQuestionnaire.js";
import { submitQuestionnaire } from "./application/use-cases/submitQuestionnaire.js";
import { updateQuestionnaireAnswer } from "./application/use-cases/updateQuestionnaireAnswer.js";
import type {
  QuestionnaireCancelledDetailsDto,
  QuestionnaireDetailsDto,
  QuestionnaireSuccessDetailsDto,
  QuestionnaireValidationFailureDetailsDto,
} from "./contract/result.js";
import { InMemoryActiveQuestionnaireStore } from "./infrastructure/runtime/InMemoryActiveQuestionnaireStore.js";
import { RandomIdGenerator } from "./infrastructure/runtime/RandomIdGenerator.js";
import {
  QuestionnaireComponent,
  type QuestionnaireUiOutcome,
} from "./presentation/QuestionnaireComponent.js";
import { QuestionnaireViewModel } from "./presentation/QuestionnaireViewModel.js";

const questionnaireOptionSchema = Type.Object(
  {
    label: Type.String({
      minLength: 1,
      description:
        "Short user-facing option label. Keep labels concise and concrete.",
    }),
    description: Type.Optional(
      Type.String({
        description:
          "Optional helper text for the option. Keep it brief and user-facing.",
      }),
    ),
  },
  { additionalProperties: false },
);

const questionnaireQuestionSchema = Type.Object(
  {
    header: Type.String({
      minLength: 1,
      description:
        "Short navigation label for the question, such as 'Framework' or 'Scope'.",
    }),
    question: Type.String({
      minLength: 1,
      description:
        "The full question shown to the user. Ask only one thing per question.",
    }),
    options: Type.Array(questionnaireOptionSchema, {
      minItems: 2,
      maxItems: 5,
      description:
        "2 to 5 concise options the user can choose from for this question.",
    }),
    multiSelect: Type.Optional(
      Type.Boolean({
        description:
          "Set true only when the user should be allowed to choose multiple options.",
      }),
    ),
    allowCustom: Type.Optional(
      Type.Boolean({
        description:
          "Set true when predefined options may be insufficient and the user may type a custom answer.",
      }),
    ),
    required: Type.Optional(
      Type.Boolean({
        description:
          "Set false only when the question may be skipped without blocking submission.",
      }),
    ),
  },
  { additionalProperties: false },
);

const questionnaireRequestSchema = Type.Object(
  {
    title: Type.Optional(
      Type.String({
        description: "Optional short title for the questionnaire as a whole.",
      }),
    ),
    instructions: Type.Optional(
      Type.String({
        description:
          "Optional brief instructions for the user. Keep them concise.",
      }),
    ),
    questions: Type.Array(questionnaireQuestionSchema, {
      minItems: 1,
      maxItems: 5,
      description:
        "1 to 5 focused questions. Prefer a small questionnaire that resolves the immediate ambiguity.",
    }),
  },
  { additionalProperties: false },
);

const activeQuestionnaireStore = new InMemoryActiveQuestionnaireStore();
const idGenerator = new RandomIdGenerator();

const QUESTIONNAIRE_TOOL: ToolDefinition<
  typeof questionnaireRequestSchema,
  QuestionnaireDetailsDto
> = {
  name: "questionnaire",
  label: "Questionnaire",
  description:
    "Ask the user a small structured questionnaire when you need clarification, clarifying requirements, preferences, or bounded choices before continuing.",
  promptSnippet:
    "questionnaire: ask the user a small structured questionnaire (1 to 5 questions, 2 to 5 options each) when you need clarification.",
  promptGuidelines: [
    "Use 1 to 5 focused questions only when normal chat is not enough.",
    "Use 2 to 5 concise options per question, with short user-facing labels.",
    "Enable multiSelect only when the user should be able to choose more than one option.",
    "Enable allowCustom only when predefined options may be insufficient.",
  ],
  parameters: questionnaireRequestSchema,
  async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
    const sessionID = getSessionID(ctx);

    const startResult = startQuestionnaire(
      {
        input: params,
        sessionID,
        hasInteractiveUI: ctx.hasUI,
      },
      {
        activeQuestionnaireStore,
        idGenerator,
      },
    );

    if (!startResult.ok) {
      return mapStartFailure(startResult.error);
    }

    const viewModel = new QuestionnaireViewModel(
      startResult.value,
      (command) =>
        updateQuestionnaireAnswer(command, { activeQuestionnaireStore }),
      (command) => submitQuestionnaire(command, { activeQuestionnaireStore }),
      (command) => cancelQuestionnaire(command, { activeQuestionnaireStore }),
    );

    try {
      const outcome = await ctx.ui.custom<QuestionnaireUiOutcome>(
        (tui, theme, _keybindings, done) =>
          new QuestionnaireComponent({
            tui,
            theme,
            viewModel,
            done,
          }),
      );

      return outcome.kind === "submitted"
        ? mapSubmittedOutcome(outcome.result)
        : mapCancelledOutcome(outcome.result);
    } finally {
      activeQuestionnaireStore.delete(sessionID);
    }
  },
  renderCall(args, theme) {
    const questionCount = args.questions.length;
    const title = args.title ?? "Questionnaire";
    const summary = `${title} · ${questionCount} question${questionCount === 1 ? "" : "s"}`;

    return new Text(
      theme.fg("toolTitle", theme.bold("questionnaire ")) +
        theme.fg("muted", summary),
      0,
      0,
    );
  },
  renderResult(result, options, theme) {
    return renderQuestionnaireResult(result, options, theme);
  },
};

export default function questionnaire(pi: ExtensionAPI) {
  pi.registerTool(QUESTIONNAIRE_TOOL);
}

function getSessionID(ctx: ExtensionContext): string {
  return ctx.sessionManager.getSessionFile() ?? `ephemeral:${ctx.cwd}`;
}

type QuestionnaireToolResult<TDetails extends QuestionnaireDetailsDto> =
  AgentToolResult<TDetails> & {
    isError?: boolean;
  };

function mapStartFailure(
  error:
    | InvalidQuestionnaireRequestError
    | InteractiveUIRequiredError
    | QuestionnaireAlreadyActiveError,
): QuestionnaireToolResult<QuestionnaireDetailsDto> {
  if (error instanceof InvalidQuestionnaireRequestError) {
    const details: QuestionnaireValidationFailureDetailsDto = {
      status: "failed",
      reason: "invalid_request",
      errors: error.issues.map((issue) =>
        issue.path ? `${issue.path}: ${issue.message}` : issue.message,
      ),
    };

    const result: QuestionnaireToolResult<QuestionnaireDetailsDto> = {
      isError: true,
      content: [{ type: "text", text: error.message }],
      details,
    };

    return result;
  }

  if (error instanceof InteractiveUIRequiredError) {
    const result: QuestionnaireToolResult<QuestionnaireDetailsDto> = {
      isError: true,
      content: [{ type: "text", text: error.message }],
      details: {
        status: "failed",
        reason: "interactive_ui_required",
      },
    };

    return result;
  }

  const result: QuestionnaireToolResult<QuestionnaireDetailsDto> = {
    isError: true,
    content: [{ type: "text", text: error.message }],
    details: {
      status: "failed",
      reason: "questionnaire_already_active",
    },
  };

  return result;
}

function mapSubmittedOutcome(
  submission: SubmittedQuestionnaireDto,
): AgentToolResult<QuestionnaireSuccessDetailsDto> {
  return {
    content: [
      {
        type: "text",
        text: [
          "Questionnaire submitted.",
          "Responses:",
          JSON.stringify(submission.responses, null, 2),
        ].join("\n"),
      },
    ],
    details: {
      status: "submitted",
      responses: submission.responses,
    },
  };
}

function mapCancelledOutcome(
  questionnaire: QuestionnaireDto,
): QuestionnaireToolResult<QuestionnaireCancelledDetailsDto> {
  const result: QuestionnaireToolResult<QuestionnaireCancelledDetailsDto> = {
    isError: true,
    content: [{ type: "text", text: "Questionnaire cancelled by user." }],
    details: {
      status: "cancelled",
      reason: "user_cancelled",
      ...(questionnaire.title !== undefined
        ? { title: questionnaire.title }
        : {}),
      ...(questionnaire.instructions !== undefined
        ? { instructions: questionnaire.instructions }
        : {}),
      questions: questionnaire.questions.map((question) => ({
        header: question.header,
        question: question.question,
        options: question.options.map((option) => ({
          label: option.label,
          ...(option.description !== undefined
            ? { description: option.description }
            : {}),
        })),
        multiSelect: question.multiSelect,
        allowCustom: question.allowCustom,
        required: question.required,
      })),
    },
  };

  return result;
}

function renderQuestionnaireResult(
  result: AgentToolResult<QuestionnaireDetailsDto>,
  options: ToolRenderResultOptions,
  theme: Theme,
): Text {
  const details = result.details;

  if (!details) {
    return new Text(
      result.content[0]?.type === "text" ? result.content[0].text : "",
      0,
      0,
    );
  }

  switch (details.status) {
    case "submitted": {
      const summary = theme.fg(
        "success",
        `✓ ${details.responses.length} question${details.responses.length === 1 ? "" : "s"} answered`,
      );

      if (!options.expanded) {
        return new Text(summary, 0, 0);
      }

      const lines = details.responses.map(
        (response) =>
          `${theme.fg("accent", response.question)}: ${response.selections.join(", ") || theme.fg("dim", "(skipped)")}`,
      );

      return new Text([summary, ...lines].join("\n"), 0, 0);
    }
    case "cancelled":
      return new Text(theme.fg("warning", "Cancelled"), 0, 0);
    case "failed":
      if (details.reason === "invalid_request" && options.expanded) {
        return new Text(
          [
            theme.fg("error", "Invalid questionnaire request"),
            ...details.errors.map((error) => theme.fg("dim", `• ${error}`)),
          ].join("\n"),
          0,
          0,
        );
      }

      return new Text(theme.fg("error", details.reason), 0, 0);
  }
}
