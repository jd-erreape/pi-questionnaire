# Questionnaire tool specification

Status: current  
Date: 2026-04-20

This document describes the public behavior of the `questionnaire` tool.
The code is the source of truth; this file documents the parts of that behavior worth relying on.

## Purpose

`questionnaire` is a small human-in-the-loop clarification tool for Pi.

Use it when a model needs a short structured choice step before continuing. It is not a general form engine or a replacement for normal chat.

## Supported behavior

- works when interactive UI is available
- accepts 1 to 5 questions per questionnaire
- accepts 2 to 5 options per question
- supports single-select and multi-select questions
- supports optional custom answers
- returns structured submitted results
- returns explicit cancellation and failure details
- allows only one active questionnaire per session

## Current limits

- interactive UI is required
- questionnaires are not resumable or persisted
- there is no detached or distributed questionnaire transport outside the active session UI
- there is no support for nested or dynamic form flows

## Request shape

```ts
interface QuestionnaireOption {
  label: string;
  description?: string;
}

interface QuestionnaireQuestion {
  header: string;
  question: string;
  options: QuestionnaireOption[];
  multiSelect?: boolean;
  allowCustom?: boolean;
  required?: boolean;
}

interface QuestionnaireRequest {
  title?: string;
  instructions?: string;
  questions: QuestionnaireQuestion[];
}
```

Defaults:

- `multiSelect = false`
- `allowCustom = true`
- `required = true`

## Validation and normalization

Before any UI is shown:

- the request must be an object
- `questions` is required and must contain 1 to 5 items
- each question must be an object with `header`, `question`, and `options`
- each `options` array must contain 2 to 5 items
- unknown fields are rejected
- `header`, `question`, and `label` must be non-empty after trimming
- `multiSelect`, `allowCustom`, and `required` must be booleans if present
- duplicate option labels in the same question are rejected after trimming and case-folding

Normalization:

- string fields are trimmed
- empty `title` and `instructions` are omitted
- question order is preserved
- option order is preserved

## Runtime behavior

- invalid requests fail before any UI is shown
- if interactive UI is unavailable, the tool fails immediately
- if another questionnaire is already active in the same session, the tool fails immediately
- optional questions may be skipped
- skipped optional questions produce an empty `selections` array
- cancellation is returned as an error-like outcome
- partial answers are discarded on cancellation

Selection rules:

- single-select questions produce at most one selection
- multi-select questions may produce multiple predefined selections
- if custom answers are allowed, one custom answer may appear alongside predefined selections

## Result details

Successful submission:

```ts
interface QuestionnaireSubmittedResponse {
  question: string;
  selections: string[];
}

interface QuestionnaireSuccessDetails {
  status: "submitted";
  responses: QuestionnaireSubmittedResponse[];
}
```

Failure details:

```ts
interface QuestionnaireValidationFailureDetails {
  status: "failed";
  reason: "invalid_request";
  errors: string[];
}

interface QuestionnaireInteractiveFailureDetails {
  status: "failed";
  reason: "interactive_ui_required";
}

interface QuestionnaireConcurrencyFailureDetails {
  status: "failed";
  reason: "questionnaire_already_active";
}

interface QuestionnaireCancelledDetails extends QuestionnaireRequest {
  status: "cancelled";
  reason: "user_cancelled";
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
```

Notes:

- `isError` is `true` for invalid request, interactive UI failure, active-questionnaire failure, and cancellation
- success response order matches question order
- the human-readable `content` text is not a stable contract
