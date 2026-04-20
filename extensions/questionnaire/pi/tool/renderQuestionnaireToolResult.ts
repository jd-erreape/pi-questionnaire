import type {
  AgentToolResult,
  Theme,
  ToolRenderResultOptions,
} from "@mariozechner/pi-coding-agent";
import { Text } from "@mariozechner/pi-tui";

import type { QuestionnaireDetailsDto } from "../../application/dto/questionnaire-result.js";

export function renderQuestionnaireToolResult(
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
        `✅ ${details.responses.length} question${details.responses.length === 1 ? "" : "s"} answered`,
      );

      if (!options.expanded) {
        return new Text(summary, 0, 1);
      }

      const lines = details.responses.map(
        (response) =>
          `${theme.fg("accent", response.question)}: ${response.selections.join(", ") || theme.fg("dim", "(skipped)")}`,
      );

      return new Text([summary, ...lines].join("\n"), 0, 1);
    }
    case "cancelled":
      return new Text(theme.fg("warning", "⚠️ Cancelled"), 0, 1);
    case "failed":
      if (details.reason === "invalid_request" && options.expanded) {
        return new Text(
          [
            theme.fg("error", "❌ Invalid questionnaire request"),
            ...details.errors.map((error) => theme.fg("dim", `• ${error}`)),
          ].join("\n"),
          0,
          1,
        );
      }

      return new Text(theme.fg("error", `❌ ${details.reason}`), 0, 1);
  }
}
