import { describe, expect, it } from "vitest";

import { createInitialGameState, validateGameState } from "../src/index.js";
import { createInput, createRelationship } from "./test-fixtures.js";

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

  it("rejects duplicate relationship IDs with a useful path", () => {
    const state = createInitialGameState(createInput());
    state.relationships = [
      createRelationship({ id: "duplicate" }),
      createRelationship({ id: "duplicate", characterId: "other" }),
    ];
    expect(() => validateGameState(state)).toThrow(/relationships\.1\.id/);
  });

  it("rejects duplicate scheduled event IDs with a useful path", () => {
    const state = createInitialGameState(createInput());
    const event = {
      id: "duplicate",
      eventId: "future_event",
      sourceEventId: "source_event",
      priority: 0,
      createdAtTurn: 0,
      consumed: false,
      triggerType: "turn" as const,
      triggerValue: 1,
    };
    state.scheduledEvents = [event, { ...event, eventId: "other_event" }];
    expect(() => validateGameState(state)).toThrow(/scheduledEvents\.1\.id/);
  });
});
