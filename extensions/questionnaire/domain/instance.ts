import type { QuestionnaireDefinition } from "./definition.js";

export interface QuestionnaireInstanceMetadata {
  requestID: string;
  sessionID: string;
}

export interface QuestionnaireInstance {
  metadata: QuestionnaireInstanceMetadata;
  definition: QuestionnaireDefinition;
}
