import type { QuestionnaireInstanceDto } from "../dto/questionnaire-instance.js";
import { toQuestionnaireDefinitionDto } from "./questionnaire-definition.js";
import type { Questionnaire } from "../../domain/questionnaire.js";

export function toQuestionnaireInstanceDto(
  questionnaire: Questionnaire,
): QuestionnaireInstanceDto {
  return {
    requestID: questionnaire.getRequestID(),
    sessionID: questionnaire.getSessionID(),
    ...toQuestionnaireDefinitionDto(questionnaire.getDefinition()),
  };
}
