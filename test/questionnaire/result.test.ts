import { describe, expect, it } from "vitest";

import { Result } from "../../extensions/questionnaire/result.js";

class FakeQuestionnaireError extends Error {
  readonly kind = "fake_questionnaire_error";
}

describe("Result", () => {
  it("creates an ok result with a value", () => {
    expect(Result.ok("questionnaire")).toEqual({
      ok: true,
      value: "questionnaire",
    });
  });

  it("creates an ok result without a value", () => {
    expect(Result.ok()).toEqual({
      ok: true,
      value: undefined,
    });
  });

  it("creates an error result with an Error instance", () => {
    const result = Result.error(new FakeQuestionnaireError("Not active"));

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected error result");
    }

    expect(result.error).toBeInstanceOf(FakeQuestionnaireError);
    expect(result.error.message).toBe("Not active");
    expect(result.error.kind).toBe("fake_questionnaire_error");
  });
});
