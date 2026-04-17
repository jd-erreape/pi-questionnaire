import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";

const STATUS_MESSAGE = "pi-questionnaire bootstrap extension is loaded.";

export default function questionnaire(pi: ExtensionAPI) {
  pi.registerCommand("questionnaire-status", {
    description: "Show bootstrap status for the questionnaire package.",
    handler: (_args, ctx) => {
      ctx.ui.notify(STATUS_MESSAGE, "info");
      return Promise.resolve();
    },
  });

  pi.registerTool({
    name: "questionnaire_status",
    label: "Questionnaire Status",
    description: "Report the bootstrap status of the questionnaire package.",
    parameters: Type.Object({}),
    execute() {
      return Promise.resolve({
        content: [{ type: "text", text: STATUS_MESSAGE }],
        details: {
          status: "ok",
          stage: "bootstrap",
        },
      });
    },
  });
}
