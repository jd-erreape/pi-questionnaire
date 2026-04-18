export interface QuestionnaireSubmittedResponseDto {
  question: string;
  selections: string[];
}

export interface QuestionnaireSuccessDetailsDto {
  status: "submitted";
  responses: QuestionnaireSubmittedResponseDto[];
}

export interface QuestionnaireValidationFailureDetailsDto {
  status: "failed";
  reason: "invalid_request";
  errors: string[];
}

export interface QuestionnaireCancelledDetailsDto {
  status: "cancelled";
  reason: "user_cancelled";
  title?: string;
  instructions?: string;
  questions: Array<{
    header: string;
    question: string;
    options: Array<{
      label: string;
      description?: string;
    }>;
    multiSelect: boolean;
    allowCustom: boolean;
    required: boolean;
  }>;
}

export type QuestionnaireDetailsDto =
  | QuestionnaireSuccessDetailsDto
  | QuestionnaireValidationFailureDetailsDto
  | {
      status: "failed";
      reason: "interactive_ui_required";
    }
  | {
      status: "failed";
      reason: "questionnaire_already_active";
    }
  | QuestionnaireCancelledDetailsDto;
