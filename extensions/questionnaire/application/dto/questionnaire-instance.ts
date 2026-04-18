import type { QuestionnaireDefinitionDto } from "./questionnaire-definition.js";

export interface QuestionnaireInstanceDto extends QuestionnaireDefinitionDto {
  requestID: string;
  sessionID: string;
}
