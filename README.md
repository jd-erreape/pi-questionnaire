# pi-questionnaire

Interactive `questionnaire` tool for Pi.

Use it when an agent needs a short, structured clarification step before continuing work - for example to confirm scope, choose between implementation options, or collect a few bounded preferences.

## What it provides

- Pi tool: `questionnaire`
- small interactive questionnaires in local Pi sessions
- 1 to 5 questions per questionnaire
- 2 to 5 options per question
- single-select or multi-select questions
- optional custom answers
- structured submitted results for the calling model
- explicit cancellation handling
- fail-fast behavior when interactive UI is unavailable

## Typical use cases

- clarifying requirements before implementation
- choosing frameworks, libraries, or scope
- collecting constrained setup preferences
- resolving ambiguity without a long back-and-forth chat

## Install

### Quick local extension loop

```bash
pi -e ./extensions/questionnaire/index.ts
```

### Install into another Pi project

```bash
pi install /absolute/path/to/pi-questionnaire -l
```

## Local checks

```bash
npm run lint
npm run check
npm test
npm run pack:check
```

## Notes

- Pi package resources are declared through the `pi` manifest in `package.json`.
- The package is source-first TypeScript and follows Pi's TypeScript loading flow.
