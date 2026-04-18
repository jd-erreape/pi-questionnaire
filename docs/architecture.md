# Questionnaire package architecture

Status: draft
Date: 2026-04-18

---

## 1. Purpose

This document defines the implementation architecture for the `questionnaire` Pi package.

It complements `docs/spec.md`:

- `docs/spec.md` defines the public behavior and tool contract
- `docs/architecture.md` defines how the codebase should be organized to implement that contract cleanly

The goal is to keep the package:

- small in surface area
- publishable
- testable
- safe in non-interactive contexts
- easy to extend later without mixing concerns

---

## 2. Architectural style

This package uses a lightweight layered architecture inspired by Clean Architecture and DDD.

The intent is to keep:

- public contract types separate from internal domain models
- domain rules separate from Pi-specific runtime code
- orchestration separate from rendering
- TUI concerns at the edge of the system

This architecture should remain lightweight.

It does **not** require heavy enterprise patterns such as:

- repositories everywhere
- domain events for simple flows
- factories for every type
- wrapper classes for every primitive

The package should prefer the simplest structure that preserves clear boundaries.

---

## 3. Layer overview

The implementation is organized into these layers under `extensions/questionnaire/`:

```text
contract/
domain/
application/
infrastructure/
presentation/
```

### 3.1 `contract`

Purpose:

- define spec-aligned external data shapes
- represent caller-authored request DTOs and tool result DTOs
- keep the public contract explicit and stable

Examples:

- questionnaire request DTOs
- success/cancel/failure result DTOs
- shared contract constants if needed

This layer represents the public tool contract, not internal behavior.

### 3.2 `domain`

Purpose:

- hold Pi-independent questionnaire concepts and rules
- express internal normalized models and invariants
- contain the core business logic of the package
- prefer rich domain models where state, lifecycle, or invariants justify them

Examples:

- normalized questionnaire definition
- `Questionnaire` aggregate root with metadata, questions, and current answers
- answer slot rules
- lifecycle invariants for submission and cancellation

This layer should be usable and testable without Pi, TUI, or extension runtime code.

### 3.3 `application`

Purpose:

- orchestrate use cases across the domain and external ports
- coordinate runtime flow without owning low-level framework details
- define application-facing command/result DTOs and runtime models
- translate between external contract DTOs, application DTOs, and domain operations
- treat application services as the boundary that performs `DTO -> Domain -> DTO`

Examples:

- execute questionnaire tool
- prepare validated and normalized questionnaire requests
- start a questionnaire instance
- initialize questionnaire interaction state
- submit or cancel a questionnaire instance

This layer owns workflow orchestration and boundary translation, not rendering.

### 3.4 `infrastructure`

Purpose:

- provide concrete adapters for Pi runtime and other technical concerns
- implement the ports required by the application layer
- keep framework and environment specifics out of the domain

Examples:

- Pi tool registration adapter
- session ID access via Pi session APIs
- in-memory active questionnaire store
- request ID generation
- mapping to Pi tool result envelopes

This layer is where the code touches Pi-specific APIs.

### 3.5 `presentation`

Purpose:

- implement TUI interaction and rendering
- manage controller/view-model concerns for questionnaire UX
- convert application DTOs and models into user-facing interaction state

Examples:

- questionnaire interaction controller
- questionnaire view model
- TUI overlay or custom component
- keyboard interaction handling

This layer should not become the source of truth for business rules.

---

## 4. Dependency rules

The architecture depends on strict dependency direction.

### Allowed dependencies

- `contract` depends on nothing project-specific
- `domain` may depend on `contract` only when unavoidable, but should generally remain independent
- `application` depends on `domain` and `contract`
- `infrastructure` depends on `application`, `domain`, and `contract`
- `presentation` depends on `application` and `contract`
- `index.ts` wires the layers together

### Forbidden dependencies

- `domain` must not import Pi APIs
- `domain` must not import TUI code
- `domain` must not import infrastructure adapters
- `application` must not import concrete Pi UI implementation details directly
- `presentation` must not import `domain` modules directly
- `presentation` must not define core questionnaire business rules
- `infrastructure` must not become the place where validation or domain invariants live

If a rule starts to require Pi runtime access, it belongs outside the domain.

---

## 5. Core model separation

The code should distinguish five different kinds of models.

### 5.1 Contract DTOs

These mirror the public spec.

Examples:

- `QuestionnaireRequestDto`
- `QuestionnaireSuccessDetailsDto`
- `QuestionnaireCancelledDetailsDto`
- `QuestionnaireFailureDetailsDto`

These are external contract shapes.

### 5.2 Domain models

These represent normalized internal questionnaire semantics.

Examples:

- `QuestionnaireDefinition`
- `QuestionDefinition`
- `QuestionOptionDefinition`
- `Questionnaire`
- `AnswerSlot`

These should express the package's internal rules clearly and independently of Pi.
Stateful and invariant-heavy behavior should live here rather than being scattered across external policy helpers.

### 5.3 Application DTOs

These define use-case boundaries.

Examples:

- `StartQuestionnaireCommand`
- `StartQuestionnaireResult`
- `SubmitQuestionnaireCommand`
- `SubmitQuestionnaireResult`
- `QuestionnaireDto`

These are the types that `presentation` and `infrastructure` should use when invoking application behavior.

### 5.4 Application runtime models

These represent live execution context inside the application layer and its internal collaboration with the domain.

Examples:

- active questionnaire registry state
- use-case coordination state
- internal mapping objects used while orchestrating domain rules

These are internal execution objects, not public contract DTOs.

### 5.5 Presentation models

These represent display or interaction state.

Examples:

- focused question index
- selected option state
- custom input state
- review/confirmation state
- rendered labels and summaries

Presentation models must not become the authoritative source of domain truth.

---

## 6. Guidance on objects vs pure functions

This package should use both object-oriented and functional styles intentionally.

### Prefer pure functions for

- validation
- normalization
- result mapping
- stateless boundary transformations
- view-model derivation

These operations are deterministic and easier to test as pure functions.

### Prefer objects or classes for

- questionnaire instance lifecycle
- questionnaire aggregate behavior
- active questionnaire coordination
- stateful controllers
- concrete infrastructure adapters

A class is appropriate when there is meaningful identity, lifecycle, or evolving state.

### Avoid unnecessary ceremony

Do not introduce a class, service, or factory unless it improves clarity for a real responsibility.
Do not push core domain behavior into a catch-all `policies/` layer when the behavior belongs to a rich domain model with state and invariants.

---

## 7. Initial module layout

The initial directory layout should be:

```text
extensions/questionnaire/
  index.ts
  contract/
  domain/
  application/
  infrastructure/
  presentation/
```

Tests should mirror the implementation structure:

```text
test/questionnaire/
  contract/
  domain/
  application/
  infrastructure/
  presentation/
```

The presence of a layer directory does not require immediate implementation inside it.

A directory may exist in advance to make the intended architecture explicit.

---

## 8. Testing strategy by layer

### Contract

Focus on:

- request and result DTO compatibility with the spec
- exact failure and success shapes
- regression coverage when the spec evolves

### Domain

Focus on:

- validation rules
- normalization rules
- duplicate detection
- ordering and immutability rules
- questionnaire aggregate behavior
- answer slot invariants

These should be fast, deterministic unit tests.

### Application

Focus on:

- use-case orchestration
- session-scoped concurrency rules
- request ID and session ID handling
- mapping between application DTOs and domain models
- mapping outcomes to tool-level behavior

These should use mocked ports.

### Infrastructure

Focus on:

- Pi adapter integration behavior
- result envelope translation
- active questionnaire storage behavior

These should stay narrow and implementation-focused.

### Presentation

Focus on:

- interaction state transitions
- view-model derivation
- keyboard intent handling
- rendering-specific edge cases

Keep presentation tests narrower than domain tests and keep them independent from domain imports.

---

## 9. Implementation direction

The implementation should proceed from the inside out.

### First

Implement the contract and domain foundations:

- request/result DTOs
- validation
- normalization
- failure result builders for non-interactive and invalid-request cases

### Next

Implement application orchestration:

- questionnaire instance creation
- session ownership
- request ID generation
- one-active-questionnaire-per-session behavior
- application DTOs that hide domain internals from presentation and infrastructure callers
- application services that map `DTO -> Domain -> DTO`

### Later

Implement presentation and Pi-specific infrastructure:

- interactive TUI flow
- cancellation handling
- final success result mapping

This order keeps correctness centered in the domain rather than in the UI.

---

## 10. Architectural intent for V1

For V1, this architecture should optimize for:

- correctness of the tool contract
- separation of domain logic from UI concerns
- deterministic non-interactive behavior
- an easy path to future extensions such as richer TUI or transport boundaries

If the package grows later, the architecture should help extension rather than force a rewrite.

If the package remains small, the architecture should still feel lightweight and easy to work with.
