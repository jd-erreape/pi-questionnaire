import type { QuestionnaireDefinitionDto } from "./questionnaire-definition.js";
import type { QuestionnaireSubmittedResponseDto } from "./questionnaire-submission.js";

export interface QuestionnaireSuccessDetailsDto {
  status: "submitted";
  responses: QuestionnaireSubmittedResponseDto[];
}

export interface QuestionnaireValidationFailureDetailsDto {
  status: "failed";
  reason: "invalid_request";
  errors: string[];
}

export interface QuestionnaireInteractiveUiRequiredDetailsDto {
  status: "failed";
  reason: "interactive_ui_required";
}

export interface QuestionnaireAlreadyActiveDetailsDto {
  status: "failed";
  reason: "questionnaire_already_active";
}

export interface QuestionnaireCancelledDetailsDto extends QuestionnaireDefinitionDto {
  status: "cancelled";
  reason: "user_cancelled";
}

export type QuestionnaireDetailsDto =
  | QuestionnaireSuccessDetailsDto
  | QuestionnaireValidationFailureDetailsDto
  | QuestionnaireInteractiveUiRequiredDetailsDto
  | QuestionnaireAlreadyActiveDetailsDto
  | QuestionnaireCancelledDetailsDto;
