import { describe, expect, it } from "vitest";

import { RandomIdGenerator } from "../../../../extensions/questionnaire/infrastructure/runtime/RandomIdGenerator.js";

describe("RandomIdGenerator", () => {
  it("returns non-empty distinct request IDs", () => {
    const generator = new RandomIdGenerator();

    const first = generator.nextRequestID();
    const second = generator.nextRequestID();

    expect(first).toEqual(expect.any(String));
    expect(second).toEqual(expect.any(String));
    expect(first.length).toBeGreaterThan(0);
    expect(second.length).toBeGreaterThan(0);
    expect(first).not.toBe(second);
  });
});
