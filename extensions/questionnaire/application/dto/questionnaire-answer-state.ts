export interface QuestionnaireAnswerSelectionDto {
  source: "option" | "custom";
  value: string;
}

export interface QuestionnaireAnswerStateSlotDto {
  selections: QuestionnaireAnswerSelectionDto[];
}

export type QuestionnaireAnswerStateDto = QuestionnaireAnswerStateSlotDto[];

export type QuestionnaireAnswerMutationDto =
  | {
      type: "select_option";
      questionIndex: number;
      label: string;
    }
  | {
      type: "toggle_option";
      questionIndex: number;
      label: string;
    }
  | {
      type: "set_custom_answer";
      questionIndex: number;
      value: string;
    }
  | {
      type: "clear_answer";
      questionIndex: number;
    };
