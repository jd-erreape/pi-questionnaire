export interface QuestionnaireSubmittedResponseDto {
  question: string;
  selections: string[];
}

export interface QuestionnaireNormalizedOptionDto {
  label: string;
  description?: string;
}

export interface QuestionnaireNormalizedQuestionDto {
  header: string;
  question: string;
  options: QuestionnaireNormalizedOptionDto[];
  multiSelect: boolean;
  allowCustom: boolean;
  required: boolean;
}

export interface QuestionnaireSuccessDetailsDto {
  status: "submitted";
  responses: QuestionnaireSubmittedResponseDto[];
}

export interface QuestionnaireFailureDetailsDto {
  status: "failed";
  reason:
    | "invalid_request"
    | "interactive_ui_required"
    | "questionnaire_already_active";
}

export interface QuestionnaireValidationFailureDetailsDto extends QuestionnaireFailureDetailsDto {
  reason: "invalid_request";
  errors: string[];
}

export interface QuestionnaireInteractiveFailureDetailsDto extends QuestionnaireFailureDetailsDto {
  reason: "interactive_ui_required";
}

export interface QuestionnaireConcurrencyFailureDetailsDto extends QuestionnaireFailureDetailsDto {
  reason: "questionnaire_already_active";
}

export interface QuestionnaireCancelledDetailsDto {
  status: "cancelled";
  reason: "user_cancelled";
  title?: string;
  instructions?: string;
  questions: QuestionnaireNormalizedQuestionDto[];
}

export type QuestionnaireDetailsDto =
  | QuestionnaireSuccessDetailsDto
  | QuestionnaireValidationFailureDetailsDto
  | QuestionnaireInteractiveFailureDetailsDto
  | QuestionnaireConcurrencyFailureDetailsDto
  | QuestionnaireCancelledDetailsDto;
