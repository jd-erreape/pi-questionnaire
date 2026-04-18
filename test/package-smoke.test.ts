import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const packageJsonPath = resolve(process.cwd(), "package.json");
const extensionPath = resolve(
  process.cwd(),
  "extensions/questionnaire/index.ts",
);

describe("package bootstrap smoke tests", () => {
  it("declares the expected Pi package manifest and scripts", async () => {
    const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8")) as {
      keywords?: string[];
      scripts?: Record<string, string>;
      pi?: { extensions?: string[] };
      peerDependencies?: Record<string, string>;
    };

    expect(packageJson.keywords).toContain("pi-package");
    expect(packageJson.pi?.extensions).toEqual(["./extensions"]);
    expect(packageJson.scripts).toMatchObject({
      lint: "npm run lint:eslint && npm run lint:prettier",
      check: "tsc --noEmit --project tsconfig.json",
      test: "vitest --run",
      "pack:check": "npm pack --dry-run --cache ./.npm-cache",
      verify: "npm run pack:check && npm run lint && npm run check && npm test",
    });
    expect(packageJson.peerDependencies).toMatchObject({
      "@mariozechner/pi-coding-agent": "*",
      "@sinclair/typebox": "*",
    });
  });

  it("exports a default extension factory function", async () => {
    await access(extensionPath);

    const module = (await import(extensionPath)) as { default: unknown };

    expect(typeof module.default).toBe("function");
  });
});
