import { describe, expect, it } from "vitest";

import { createInitialGameState, validateGameState } from "../src/index.js";
import { createInput } from "./test-fixtures.js";

describe("validateGameState", () => {
  it("returns a fully validated game state", () => {
    const state = createInitialGameState(createInput());
    expect(validateGameState(state)).toEqual(state);
  });

  it("rejects an inconsistent football level", () => {
    const state = createInitialGameState(createInput());
    state.stats.footballLevel += 1;
    expect(() => validateGameState(state)).toThrow(
      /stats\.footballLevel must be/,
    );
  });

  it("reports structural paths in comprehensible errors", () => {
    const state = createInitialGameState(createInput());
    const invalid = { ...state, runId: "" };
    expect(() => validateGameState(invalid)).toThrow(/runId/);
  });

  it("accepts absent optional properties", () => {
    const input = createInput();
    delete input.birthCity;
    const state = createInitialGameState(input);
    expect(Object.hasOwn(state.profile, "birthCity")).toBe(false);
    expect(() => validateGameState(state)).not.toThrow();
  });
});
