# pi-questionnaire

Bootstrap for a publishable **Pi package** that will provide a `questionnaire` extension/tool.

## Status

This repository currently contains only the project skeleton:

- Pi package manifest
- TypeScript setup
- ESLint + Prettier
- Vitest smoke tests
- GitHub Actions CI
- a bootstrap extension entrypoint for real Pi install/load checks

It does **not** implement the real questionnaire flow yet.

## Bootstrap smoke target

The extension currently exposes:

- command: `/questionnaire-status`
- tool: `questionnaire_status`

Both return the same bootstrap-only status message so the package can be validated in a real Pi installation.

## Install and test with Pi

### Quick extension loop

```bash
pi -e ./extensions/questionnaire/index.ts
```

### Real package loop

Install this package into another Pi project using a local path:

```bash
pi install /absolute/path/to/pi-questionnaire -l
```

Then start Pi in that project and verify the bootstrap command/tool is available.

## Local development checks

```bash
npm run verify
```

Or run the individual checks:

```bash
npm run lint
npm run check
npm test
npm run pack:check
```

## Notes

- Pi package resources are declared through the `pi` manifest in `package.json`.
- Pi core libraries are listed as `peerDependencies` and also installed locally as `devDependencies` for development.
- The package is source-first TypeScript and relies on Pi's documented TypeScript loading flow.
