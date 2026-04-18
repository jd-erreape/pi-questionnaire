# Questionnaire tool specification

Status: draft
Version: V1
Date: 2026-04-17

---

## 1. Overview

The `questionnaire` tool is a human-in-the-loop clarification primitive for Pi.

It allows the model to pause execution, ask the user a small structured questionnaire, and continue with machine-readable answers.

The tool is intended for cases such as:

- clarifying ambiguous implementation choices
- plan-mode follow-up questions
- small configuration wizards
- choosing between bounded options before taking action

The tool is **not** intended to be:

- a replacement for normal chat
- a large general-purpose form engine
- a long-running survey system
- a remote/distributed questionnaire transport in V1

---

## 2. V1 scope

V1 includes:

- local interactive Pi session support
- small bounded questionnaires
- single-select and multi-select questions
- optional custom answers
- structured success results
- explicit cancellation handling
- fail-fast behavior when no interactive UI is available

V1 does **not** include:

- parent/child subagent routing
- RPC-based answer relay
- persisted resumable questionnaires
- arbitrary dynamic nested forms
- multiple simultaneous questionnaires in one session

---

## 3. Tool name and invocation contract

The public tool name is:

- `questionnaire`

A `questionnaire` request is validated before any interactive UI is shown.

If the request is invalid, the tool must fail immediately.

If the environment does not support interactive UI, the tool must fail immediately.

If another questionnaire is already active in the same session, the tool must fail immediately in V1.

---

## 4. Tool request schema

This section defines the caller-authored input for the `questionnaire` tool.

The public V1 request schema is:

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

### 4.1 Canonical field names

V1 uses these canonical field names:

- `multiSelect`
- `allowCustom`
- `required`

V1 does **not** support aliases.

For example:

- `multiple` is invalid
- `multi_select` is invalid

Unknown fields should be rejected rather than silently ignored.

### 4.2 Field semantics

The tool request schema is authored by the caller.

It does not include host-assigned questionnaire instance metadata such as `requestID` or `sessionID`.

#### `title`

- optional
- short title for the questionnaire as a whole
- may be shown in the UI and echoed in result details

#### `instructions`

- optional
- brief helper text for the user
- should stay concise

#### `questions`

- required
- ordered list of questions to ask
- submitted responses are returned in the same order

#### `header`

- required
- short label for the question
- intended for compact navigation and UI context

#### `question`

- required
- the main prompt shown to the user

#### `options`

- required
- list of predefined selectable choices for the question

#### `multiSelect`

- optional
- default: `false`
- when `true`, the user may select multiple options for the question
- when `false`, the user may submit only one final selection

#### `allowCustom`

- optional
- default: `true`
- when `true`, the user may provide a custom answer outside the predefined options
- when `false`, the user is limited to the predefined options

#### `required`

- optional
- default: `true`
- when `true`, the question must be answered before submission
- when `false`, the question may be skipped

---

## 5. Questionnaire instance metadata and association rules

This section defines the host-assigned metadata and alignment rules that apply after a valid tool request has been accepted.

### 5.1 Questionnaire instance metadata

Once a valid request is accepted, the host creates a questionnaire instance.

Each questionnaire instance has this metadata:

```ts
interface QuestionnaireInstanceMetadata {
  requestID: string;
  sessionID: string;
}
```

#### `requestID`

- required
- host-assigned identifier for the questionnaire instance
- uniquely identifies the live questionnaire within the host runtime
- is used to associate submission, cancellation, and rejection with the correct questionnaire instance

#### `sessionID`

- required
- host-assigned identifier for the session that owns the questionnaire instance
- is used to scope questionnaire lifecycle and concurrency behavior to a session

Questionnaire instance metadata is not part of the caller-authored tool request schema.

### 5.2 Association model

Answers are associated with questions using both:

- the questionnaire instance identified by `requestID`
- the position of the question in the questionnaire instance's normalized `questions` array

Within a questionnaire instance:

- answer slot `i` corresponds to question `i`
- positional association is defined against the normalized question list
- question text is not used as the primary association key

### 5.3 Immutability of normalized questions

For the lifetime of a questionnaire instance:

- the normalized `questions` list must remain fixed
- questions must not be inserted, removed, or reordered
- options within each normalized question must not be reordered

All answer alignment rules are evaluated against that fixed normalized ordering.

---

## 6. Validation rules

Validation happens before interaction begins.

### 6.1 Request-level rules

- the request must be an object
- `questions` must be present
- `questions.length` must be between `1` and `5`, inclusive
- unknown top-level fields must be rejected

### 6.2 Question-level rules

For each question:

- the question must be an object
- `header` is required
- `question` is required
- `options` is required
- `options.length` must be between `2` and `5`, inclusive
- unknown question fields must be rejected

### 6.3 Option-level rules

For each option:

- the option must be an object
- `label` is required
- `description` is optional
- unknown option fields must be rejected

### 6.4 String validation

The following fields must be strings if present:

- `title`
- `instructions`
- `header`
- `question`
- `label`
- `description`

The following fields must be non-empty after trimming leading and trailing whitespace:

- `header`
- `question`
- `label`

### 6.5 Duplicate option labels

Within a single question, duplicate option labels must be rejected.

Duplicate comparison is performed after trimming and case-folding.

Examples of invalid duplicates within the same question:

- `"React"` and `"React"`
- `"React"` and `" react "`
- `"React"` and `"react"`

### 6.6 Type validation

If present:

- `multiSelect` must be a boolean
- `allowCustom` must be a boolean
- `required` must be a boolean

### 6.7 Length guidance

V1 does not define hard maximum string lengths beyond the validation rules above.

However, callers should keep:

- `title`
- `instructions`
- `header`
- `question`
- option labels and descriptions

concise enough to fit comfortably in an interactive terminal UI.

This guidance is advisory, not a V1 validation rule.

---

## 7. Normalization rules

A valid request is normalized before use.

### 7.1 String normalization

The implementation must trim leading and trailing whitespace from:

- `title`
- `instructions`
- `header`
- `question`
- `label`
- `description`

Trimmed optional strings that become empty may be omitted in normalized output.

### 7.2 Default values

If omitted, fields default as follows:

- `multiSelect = false`
- `allowCustom = true`
- `required = true`

### 7.3 Ordering

The order of `questions` must be preserved.

The order of `options` within each question must be preserved.

### 7.4 Normalized question echo

Success results must echo the normalized question text in `details.responses`.

That means each `details.responses[i].question` value must match the normalized `question` text for question slot `i`.

---

## 8. Interaction semantics

This section defines user-visible behavior, not renderer internals.

### 8.1 General execution model

When a valid request is accepted in an interactive session:

1. the host creates a questionnaire instance with `requestID` and `sessionID`
2. tool execution pauses
3. the questionnaire is shown to the user
4. the user submits answers or cancels
5. the tool returns a structured result

### 8.2 Invalid requests

Invalid requests must fail before any UI is shown.

### 8.3 Single-select questions

For a question where `multiSelect = false`:

- the final answer must contain at most one selection
- if `allowCustom = true`, that single selection may be a custom answer

### 8.4 Multi-select questions

For a question where `multiSelect = true`:

- the final answer may contain multiple selections
- if `allowCustom = true`, custom answers may be included alongside predefined options

### 8.5 Optional questions

For a question where `required = false`:

- the user may skip the question
- skipped optional questions still occupy a stable answer slot in the result
- a skipped optional question is represented by:

```ts
{
  selections: [],
  custom: false
}
```

### 8.6 Cancellation

The user may cancel the questionnaire.

Cancellation is treated as an error-like outcome in V1.

Partial answers are discarded in V1.

### 8.7 Concurrency

V1 allows only one active questionnaire per session.

If a second questionnaire is requested while another is active in the same session, the second request must be rejected immediately.

---

## 9. Result schema

### 9.1 Submitted response representation

The public submitted response representation is:

```ts
interface QuestionnaireSubmittedResponse {
  question: string;
  selections: string[];
}
```

#### `question`

- the normalized question text for the response slot
- is echoed so consumers do not need to zip parallel arrays together

#### `selections`

- ordered list of final selections for the question
- for single-select questions, length is `0` or `1`
- for multi-select questions, length may be greater than `1`
- for skipped optional questions, the value is `[]`
- entries may contain predefined option labels, custom answers, or both

Every question must always occupy exactly one response slot.

A response array with missing, sparse, or reordered slots is invalid.

### 9.2 Successful result details

On successful submission, `details` must have this shape:

```ts
interface QuestionnaireSuccessDetails {
  status: "submitted";
  responses: QuestionnaireSubmittedResponse[];
}
```

Rules:

- `responses.length` must equal the questionnaire's normalized question count
- each question must occupy exactly one response slot
- response slot `i` must align with question `i`
- `responses[i].question` must equal the normalized question text for question `i`
- the alignment contract applies to the fixed normalized ordering created when the questionnaire instance was accepted

### 9.3 Successful tool result envelope

A successful tool result should follow this shape:

```ts
{
  content: [{ type: "text", text: "User answered 2 questions." }],
  details: {
    status: "submitted",
    responses: [...]
  }
}
```

The human-readable `content` text may vary, but the structured `details` contract must remain stable.

---

## 10. Error-like outcomes

V1 defines four main error-like outcome classes:

- request validation failure
- non-interactive environment failure
- questionnaire cancellation
- concurrent questionnaire rejection

### 10.1 Validation failure

Validation failure result details should follow this shape:

```ts
interface QuestionnaireValidationFailureDetails {
  status: "failed";
  reason: "invalid_request";
  errors: string[];
}
```

Expected behavior:

- `isError` should be `true`
- `errors` should contain one or more human-readable validation messages
- no interactive UI should be shown

Example envelope:

```ts
{
  isError: true,
  content: [{ type: "text", text: "Invalid questionnaire request." }],
  details: {
    status: "failed",
    reason: "invalid_request",
    errors: ["questions must contain between 1 and 5 items"]
  }
}
```

### 10.2 Non-interactive failure

Non-interactive failure result details should follow this shape:

```ts
interface QuestionnaireInteractiveFailureDetails {
  status: "failed";
  reason: "interactive_ui_required";
}
```

Expected behavior:

- `isError` should be `true`
- the tool must fail immediately
- the tool must not wait, poll, or block indefinitely

Example envelope:

```ts
{
  isError: true,
  content: [{ type: "text", text: "questionnaire requires interactive UI support." }],
  details: {
    status: "failed",
    reason: "interactive_ui_required"
  }
}
```

### 10.3 Cancellation result

Cancellation result details should follow this shape:

```ts
interface QuestionnaireCancelledDetails {
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
```

Expected behavior:

- `isError` should be `true`
- the cancellation applies to the questionnaire instance identified by its host-assigned metadata
- partial answers are not returned
- normalized questions may be echoed for context

Example envelope:

```ts
{
  isError: true,
  content: [{ type: "text", text: "Questionnaire cancelled by user." }],
  details: {
    status: "cancelled",
    reason: "user_cancelled",
    title: "Implementation preferences",
    questions: [...]
  }
}
```

### 10.4 Concurrent questionnaire rejection

Concurrent questionnaire rejection details should follow this shape:

```ts
interface QuestionnaireConcurrencyFailureDetails {
  status: "failed";
  reason: "questionnaire_already_active";
}
```

Expected behavior:

- `isError` should be `true`
- the second request must be rejected immediately

Example envelope:

```ts
{
  isError: true,
  content: [{ type: "text", text: "Another questionnaire is already active for this session." }],
  details: {
    status: "failed",
    reason: "questionnaire_already_active"
  }
}
```

---

## 11. Examples

### 11.1 Valid minimal request

```json
{
  "questions": [
    {
      "header": "Framework",
      "question": "Which frontend framework should I target?",
      "options": [{ "label": "React" }, { "label": "Vue" }]
    }
  ]
}
```

Normalized interpretation:

```json
{
  "questions": [
    {
      "header": "Framework",
      "question": "Which frontend framework should I target?",
      "options": [{ "label": "React" }, { "label": "Vue" }],
      "multiSelect": false,
      "allowCustom": true,
      "required": true
    }
  ]
}
```

### 11.2 Valid multi-question request

```json
{
  "title": "Implementation preferences",
  "instructions": "Keep answers concise.",
  "questions": [
    {
      "header": "Framework",
      "question": "Which frontend framework should I target?",
      "options": [
        { "label": "React", "description": "Component-driven" },
        { "label": "Vue", "description": "Progressive framework" },
        { "label": "Svelte", "description": "Compile-time approach" }
      ]
    },
    {
      "header": "Testing",
      "question": "Which testing layers should I include?",
      "options": [
        { "label": "Unit tests" },
        { "label": "Integration tests" },
        { "label": "E2E tests" }
      ],
      "multiSelect": true,
      "required": false
    }
  ]
}
```

### 11.3 Valid request with custom answers disabled

```json
{
  "questions": [
    {
      "header": "Scope",
      "question": "What scope should I target?",
      "options": [
        { "label": "Current file" },
        { "label": "Current directory" },
        { "label": "Whole repository" }
      ],
      "allowCustom": false
    }
  ]
}
```

### 11.4 Invalid request: too many questions

```json
{
  "questions": [
    {
      "header": "1",
      "question": "Q1",
      "options": [{ "label": "A" }, { "label": "B" }]
    },
    {
      "header": "2",
      "question": "Q2",
      "options": [{ "label": "A" }, { "label": "B" }]
    },
    {
      "header": "3",
      "question": "Q3",
      "options": [{ "label": "A" }, { "label": "B" }]
    },
    {
      "header": "4",
      "question": "Q4",
      "options": [{ "label": "A" }, { "label": "B" }]
    },
    {
      "header": "5",
      "question": "Q5",
      "options": [{ "label": "A" }, { "label": "B" }]
    },
    {
      "header": "6",
      "question": "Q6",
      "options": [{ "label": "A" }, { "label": "B" }]
    }
  ]
}
```

Reason:

- `questions.length` exceeds the V1 maximum of `5`

### 11.5 Invalid request: duplicate options

```json
{
  "questions": [
    {
      "header": "Framework",
      "question": "Which framework should I use?",
      "options": [{ "label": "React" }, { "label": " react " }]
    }
  ]
}
```

Reason:

- duplicate option labels after trimming and case-folding

### 11.6 Invalid request: unsupported field alias

```json
{
  "questions": [
    {
      "header": "Testing",
      "question": "What should I add?",
      "options": [{ "label": "Unit tests" }, { "label": "Integration tests" }],
      "multiple": true
    }
  ]
}
```

Reason:

- `multiple` is not part of the public V1 contract
- the canonical field name is `multiSelect`

### 11.7 Success result example

```json
{
  "content": [
    {
      "type": "text",
      "text": "User answered 2 questions."
    }
  ],
  "details": {
    "status": "submitted",
    "responses": [
      {
        "question": "Which frontend framework should I target?",
        "selections": ["React"]
      },
      {
        "question": "Which testing layers should I include?",
        "selections": []
      }
    ]
  }
}
```

### 11.8 Cancel result example

```json
{
  "isError": true,
  "content": [
    {
      "type": "text",
      "text": "Questionnaire cancelled by user."
    }
  ],
  "details": {
    "status": "cancelled",
    "reason": "user_cancelled",
    "title": "Implementation preferences",
    "questions": [
      {
        "header": "Framework",
        "question": "Which frontend framework should I target?",
        "options": [{ "label": "React" }, { "label": "Vue" }],
        "multiSelect": false,
        "allowCustom": true,
        "required": true
      }
    ]
  }
}
```

### 11.9 Non-interactive failure example

```json
{
  "isError": true,
  "content": [
    {
      "type": "text",
      "text": "questionnaire requires interactive UI support."
    }
  ],
  "details": {
    "status": "failed",
    "reason": "interactive_ui_required"
  }
}
```

---

## 12. Non-normative implementation notes

This section is informative only.

### 12.1 Why responses are index-aligned

Responses are aligned by question index so consumers do not have to depend on question text uniqueness.

### 12.2 Why unknown fields are rejected

Rejecting unknown fields keeps the public contract strict and reduces ambiguity during implementation and testing.

### 12.3 Why only one active questionnaire is allowed in V1

V1 prioritizes deterministic local behavior and a smaller implementation surface.

More advanced routing and concurrency models can be added later without weakening the basic local contract.

---

## 13. Future considerations

Possible future extensions include:

- parent/child questionnaire routing
- broker-based transport boundaries
- session-aware remote answer delivery
- richer conditional follow-up flows
- more advanced concurrency strategies

These are out of scope for V1 and are not part of this contract.
