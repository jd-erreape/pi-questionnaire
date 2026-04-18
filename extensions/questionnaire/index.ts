import type {
  ExtensionAPI,
  ToolDefinition,
} from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";

import type { QuestionnaireDetailsDto } from "./application/dto/questionnaire-result.js";
import { executeQuestionnaireTool } from "./infrastructure/pi/executeQuestionnaireTool.js";
import { renderQuestionnaireToolCall } from "./infrastructure/pi/renderQuestionnaireToolCall.js";
import { renderQuestionnaireToolResult } from "./infrastructure/pi/renderQuestionnaireToolResult.js";

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
          "Default to true use it only when the user should be allowed to choose multiple options, otherwise set to false",
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
    return executeQuestionnaireTool(params, ctx);
  },
  renderCall(args, theme) {
    return renderQuestionnaireToolCall(args, theme);
  },
  renderResult(result, options, theme) {
    return renderQuestionnaireToolResult(result, options, theme);
  },
};

export default function questionnaire(pi: ExtensionAPI) {
  pi.registerTool(QUESTIONNAIRE_TOOL);
}
