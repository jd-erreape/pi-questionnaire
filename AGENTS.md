# AGENTS.md

Guidance for coding agents working in this repository.

## Purpose

This repository contains a TypeScript Pi package for the `questionnaire` tool.

Prefer solutions that keep the package:

- small
- publishable
- testable
- safe in non-interactive contexts

## Working style

- Start with a short plan before editing.
- Prefer minimal diffs.
- Explain changes in plain language.
- Keep code, comments, docs, and commit messages in English.
- Ask before large refactors, new dependencies, public contract changes, or destructive file moves.

## Source of truth

- The code is the source of truth.
- `docs/spec.md` should describe the public tool behavior.
- `docs/architecture.md` should describe the intended code boundaries.
- When code and docs drift, update the docs to match the verified implementation unless the task is explicitly changing behavior.

## Verification

After code changes, run:

```bash
npm run lint
npm run check
npm test
npm run pack:check
```

If you skip any of these, say so explicitly.

TDD is the default for behavior changes. Documentation-only changes are an allowed exception.

## Architecture rules

- Keep `domain` independent from Pi APIs and UI code.
- Treat `application` as the `DTO -> Domain -> DTO` boundary.
- Keep `presentation` dependent on `application`, not `domain`.
- Do not put core questionnaire rules in `presentation`, `pi`, or `infrastructure`.
- Prefer direct imports over internal barrel files.

## Delivery checklist

Report:

- what changed
- which files changed
- which commands were run
- whether lint/check/tests/pack:check passed
- any follow-up work or open questions
