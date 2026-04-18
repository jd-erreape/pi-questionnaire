# AGENTS.md

Guidance for coding agents working in this repository.

## Project intent

This repository is for a **Pi package** implemented in **TypeScript**, currently aimed at building a high-quality `questionnaire` extension/tool for Pi.

Prefer solutions that keep the package:

- publishable
- testable
- small in surface area
- safe in non-interactive contexts
- easy to validate in a real Pi installation

## Working style

- Start with a short plan before making edits.
- Prefer minimal diffs over broad rewrites.
- Explain changes in plain language.
- Ask before large refactors, dependency additions, or public API changes.
- Keep code, comments, docs, and commit messages in English.

## Quality gates

For any **code change**:

1. run linting
2. run type checks
3. run tests
4. report the exact commands run and the result

Do not claim work is done if these were skipped.

If the repo does not yet expose the needed scripts, call that out explicitly and treat it as missing project setup rather than silently skipping verification.

### Expected repo commands

As the repo is bootstrapped, standardize on these script entrypoints:

```bash
npm run lint
npm run check
npm test
npm run pack:check
```

Notes:

- `lint` = formatting/linting validation
- `check` = typecheck and any additional static verification
- `test` = automated test suite
- `pack:check` = publish/package smoke check

If a change introduces one of these capabilities, wire it through these script names.

## TDD policy

TDD is the default for behavior changes.

### Required workflow

Use **red -> green -> refactor** for:

- new features with real logic
- bug fixes
- regressions
- changes to parsing, normalization, validation, runtime flow, or tool result shapes

### Practical rules

- Write or update a failing test first when changing behavior.
- For bug fixes, add a regression test that fails before the fix.
- Make the smallest change needed to get the test green.
- Refactor only after tests are green.
- Do not remove or weaken tests just to make the suite pass.

### Acceptable exceptions

Test-first is not mandatory for:

- documentation-only changes
- pure repo scaffolding with no runtime behavior yet
- mechanical renames with no behavior change
- initial bootstrap work where the first task is creating the test harness itself

When using an exception, state it clearly.

## Testing expectations

Prefer tests that are fast, deterministic, and local.

Prioritize coverage for:

- schema validation
- normalization/defaulting
- questionnaire state transitions
- cancellation and error paths
- non-interactive fail-fast behavior
- package manifest / install smoke checks

Prefer pure unit tests for domain/runtime logic. Keep UI-specific tests narrower and focused on interaction/state transitions.

## Pi package conventions

- Build this as a **Pi package**, not as app-specific code.
- Prefer an explicit `pi` manifest in `package.json`.
- Keep extension entrypoints easy to discover.
- Keep runtime/domain logic separate from Pi UI glue where practical.
- If a feature depends on interactive TUI behavior, it must fail fast in unsupported modes rather than hang.
- Prefer source-first TypeScript unless a build step is clearly needed.

## Canonical questionnaire docs

For any implementation, refactor, or test change related to the `questionnaire` package:

- read `docs/spec.md` as the canonical behavioral contract
- read `docs/architecture.md` as the canonical code organization and layering guide
- do not silently implement behavior that contradicts those docs
- if code and docs disagree, treat the docs as canonical unless the task explicitly includes updating them
- if intended behavior changes, update the relevant docs first or in the same change

## Architecture rules

- Follow the layered architecture defined in `docs/architecture.md`.
- Keep UI architecture framework-independent.
- Domain/runtime logic must not depend directly on a specific UI rendering approach.
- UI should consume stable contract types and view-model-like state, not own the business rules.
- Prefer small composable modules over large monolithic extension files.
- Preserve clear separation between:
  - contract
  - domain
  - application
  - infrastructure
  - presentation
- Keep request/result contract DTOs separate from internal domain models.
- Do not import Pi APIs into `domain`.
- Do not place domain policy in `infrastructure`.
- Do not place core questionnaire rules in `presentation`.
- Do not introduce barrel files (`index.ts` files that only re-export sibling modules) for internal module organization.
- Prefer direct imports from the defining module so dependencies stay explicit and easy to trace.

## Dependency policy

- Ask before adding new runtime dependencies.
- Prefer no dependency over a new dependency.
- Prefer small, well-known libraries when a dependency is justified.
- Avoid locking the package to unnecessary framework choices.

For Pi-specific libraries used by the package, prefer the packaging conventions documented by Pi when the repo is bootstrapped.

## Safety and boundaries

### Always

- preserve user intent
- keep changes scoped to the task
- add or update tests with behavior changes
- run relevant verification after code changes
- note follow-up work and known gaps explicitly

### Ask first

- new dependencies
- large refactors
- changes to the public tool contract
- CI/release workflow changes with broad impact
- destructive file moves or deletions
- steering the implementation in a way that changes scope, sequencing, or architecture beyond the user's explicit request

When steering may be helpful, present the proposed direction clearly and wait for explicit human consent before proceeding.

### Never

- invent passing test results
- skip verification silently
- remove intentional functionality without confirmation
- commit secrets, tokens, or credentials
- edit generated/lock files unnecessarily

## Repo bootstrap guidance

This repository is still being established. While bootstrapping it:

- prefer conventions that support publishing as a Pi package
- define one clear way to lint, one clear way to typecheck, and one clear way to test
- add CI only after the local scripts are working reliably
- optimize for a fast local development loop against a real Pi installation

## Delivery checklist

For each implementation task, report:

- what changed
- which files changed
- which commands were run
- whether lint/check/tests passed
- any follow-up work or open questions
