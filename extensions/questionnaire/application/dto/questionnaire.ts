import type { QuestionnaireDraftAnswersDto } from "./questionnaire-draft-answers.js";
import type { QuestionnaireDefinitionDto } from "./questionnaire-definition.js";
import type { QuestionnaireMetadataDto } from "./questionnaire-metadata.js";

export interface QuestionnaireDto
  extends QuestionnaireMetadataDto, QuestionnaireDefinitionDto {
  draftAnswers: QuestionnaireDraftAnswersDto;
}
