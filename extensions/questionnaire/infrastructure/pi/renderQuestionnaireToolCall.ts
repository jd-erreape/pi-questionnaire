import type { Theme } from "@mariozechner/pi-coding-agent";
import { Text } from "@mariozechner/pi-tui";

import type { QuestionnaireInputDto } from "../../application/dto/questionnaire-input.js";

export function renderQuestionnaireToolCall(
  args: Pick<QuestionnaireInputDto, "title" | "questions">,
  theme: Theme,
): Text {
  const questionCount = args.questions.length;
  const title = args.title ?? "Questionnaire";
  const summary = `${title} · ${questionCount} question${questionCount === 1 ? "" : "s"}`;

  return new Text(
    theme.fg("toolTitle", theme.bold("questionnaire ")) +
      theme.fg("muted", summary),
    0,
    0,
  );
}
