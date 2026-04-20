# Questionnaire package architecture

Status: current  
Date: 2026-04-20

This document describes the intended code organization of the package.
The code is the source of truth; this file records the boundaries we want to preserve.

## Goal

Keep questionnaire rules independent from Pi APIs, keep orchestration separate from rendering, and keep the package small.

## Layers

Implementation lives under `extensions/questionnaire/` in these layers:

```text
domain/
application/
infrastructure/
presentation/
pi/
```

### `domain`

Owns questionnaire rules and state transitions.

- no Pi imports
- no UI code
- no infrastructure adapters

### `application`

Owns use cases and DTO boundaries.

Examples:

- request validation and normalization
- start, update, submit, cancel, and dispose use cases
- mapping between DTOs and domain objects

### `infrastructure`

Owns technical adapters used by the application layer.

Examples:

- active questionnaire storage
- request ID generation

It should stay technical and should not own business rules.

### `presentation`

Owns framework-independent interaction and view-model state.

It depends on `application` and must not import `domain` directly.

### `pi`

Owns Pi-specific integration.

Examples:

- tool registration
- tool execution adapter
- Pi result mapping
- Pi presenters and components

Normal Pi runtime code should depend on `application` and `presentation`.
Direct `infrastructure` imports are only acceptable in composition/bootstrap code that wires concrete adapters into the tool.

## Dependency direction

Allowed:

- `application` -> `domain`
- `infrastructure` -> `application`, `domain`
- `presentation` -> `application`
- `pi` -> `application`, `presentation`

Forbidden:

- `domain` -> any other project layer
- `presentation` -> `domain`
- `application` -> concrete Pi UI code
- `presentation` -> core questionnaire business rules
- `pi` -> core questionnaire business rules
- `infrastructure` -> validation or domain invariants

## Practical rules

- prefer pure functions for validation, normalization, and DTO mapping
- prefer objects/classes for stateful questionnaire lifecycle and stateful view models
- keep public DTOs, domain models, and presentation models distinct
- do not move business rules into UI code
- avoid unnecessary abstractions and internal barrel files
