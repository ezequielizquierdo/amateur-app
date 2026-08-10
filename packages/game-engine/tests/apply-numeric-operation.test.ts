import { describe, expect, it } from "vitest";

import { applyNumericOperation } from "../src/events/effects/apply-numeric-operation.js";
import { InternalEffectApplicationError } from "../src/events/effects/internal-effect-application-error.js";

describe("applyNumericOperation", () => {
  it("sets a fractional value without a limit", () => {
    expect(applyNumericOperation(10, "set", 12.5, "none")).toBe(12.5);
  });

  it("adds values", () => {
    expect(applyNumericOperation(10, "add", 5, "none")).toBe(15);
  });

  it("multiplies values", () => {
    expect(applyNumericOperation(10, "multiply", 2, "none")).toBe(20);
  });

  it.each([
    [95, "add", 10, 100],
    [5, "add", -10, 0],
  ] as const)("clamps a scale", (previous, operation, requested, expected) => {
    expect(applyNumericOperation(previous, operation, requested, "scale")).toBe(
      expected,
    );
  });

  it("applies a nonnegative minimum without an upper bound", () => {
    expect(applyNumericOperation(5, "add", -10, "nonnegative")).toBe(0);
    expect(applyNumericOperation(100, "add", 250, "nonnegative")).toBe(350);
  });

  it("does not limit a negative result when the limit is none", () => {
    expect(applyNumericOperation(5, "multiply", -2, "none")).toBe(-10);
  });

  it("accepts multiplication by zero", () => {
    expect(applyNumericOperation(50, "multiply", 0, "scale")).toBe(0);
  });

  it("normalizes negative zero", () => {
    const result = applyNumericOperation(0, "multiply", -1, "none");
    expect(result).toBe(0);
    expect(Object.is(result, -0)).toBe(false);
  });

  it.each([
    [Number.MAX_VALUE, "add", Number.MAX_VALUE],
    [0, "set", Number.NaN],
  ] as const)(
    "rejects a non-finite calculated result",
    (previous, operation, requested) => {
      expect(() =>
        applyNumericOperation(previous, operation, requested, "scale"),
      ).toThrow(InternalEffectApplicationError);

      try {
        applyNumericOperation(previous, operation, requested, "scale");
      } catch (error) {
        expect(error).toMatchObject({ code: "INVALID_NUMERIC_RESULT" });
      }
    },
  );
});
