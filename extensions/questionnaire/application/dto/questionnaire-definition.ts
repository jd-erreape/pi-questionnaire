import type { QuestionnaireNormalizedQuestionDto } from "../../contract/result.js";

export interface QuestionnaireDefinitionDto {
  title?: string;
  instructions?: string;
  questions: QuestionnaireNormalizedQuestionDto[];
}
