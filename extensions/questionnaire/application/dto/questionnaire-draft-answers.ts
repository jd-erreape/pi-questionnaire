export interface QuestionnaireDraftSelectionDto {
  source: "option" | "custom";
  value: string;
}

export interface QuestionnaireDraftAnswerDto {
  selections: QuestionnaireDraftSelectionDto[];
}

export type QuestionnaireDraftAnswersDto = QuestionnaireDraftAnswerDto[];

export type QuestionnaireDraftAnswerMutationDto =
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
