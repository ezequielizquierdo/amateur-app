import { describe, expect, it } from "vitest";

import { GameEffectSchema } from "../../src/index.js";

describe("game effects", () => {
  const validHistoryKeys = [
    "test",
    "a",
    "accepted_offer",
    "counter_2",
    "2_attempts",
  ] as const;
  const invalidHistoryKeys = [
    "",
    "   ",
    " exact ",
    "__proto__",
    "prototype",
    "constructor",
    "UPPERCASE",
    "with-dash",
    "with.dot",
    "double__underscore",
    "_leading",
    "trailing_",
  ] as const;

  it.each([
    { type: "player_stat", field: "mood", operation: "add", value: -5 },
    {
      type: "football_attribute",
      field: "technique",
      operation: "multiply",
      value: 1.1,
    },
    { type: "life_state", field: "city", operation: "set", value: "Córdoba" },
    {
      type: "life_state",
      field: "numberOfChildren",
      operation: "add",
      value: 1,
    },
    { type: "life_state", field: "employerId", operation: "clear" },
    {
      type: "football_state",
      field: "status",
      operation: "set",
      value: "academy",
    },
    { type: "football_state", field: "salary", operation: "add", value: 50 },
    { type: "football_state", field: "currentTeamId", operation: "clear" },
    { type: "flag", key: "accepted_offer", value: true },
    {
      type: "relationship_value",
      selector: { type: "friend" },
      field: "trust",
      operation: "add",
      value: 5,
    },
    {
      type: "create_relationship",
      relationship: {
        id: "new_friend",
        characterId: "character_1",
        type: "friend",
        displayName: "Sam",
        affection: 50,
        trust: 50,
        conflict: 0,
        tags: [],
      },
      conflictPolicy: "error",
    },
    { type: "deactivate_relationship", relationshipId: "relationship-1" },
    {
      type: "schedule_event",
      followUp: {
        eventId: "second_trial",
        trigger: { type: "turn", afterTurns: 2 },
        priority: 5,
      },
    },
  ])("accepts a valid effect variant", (effect) => {
    expect(GameEffectSchema.safeParse(effect).success).toBe(true);
  });

  it.each([
    { type: "player_stat", field: "footballLevel", operation: "add", value: 1 },
    { type: "life_state", field: "city", operation: "add", value: 1 },
    { type: "football_state", field: "status", operation: "add", value: 1 },
    { type: "life_state", field: "city", operation: "clear" },
    { type: "football_state", field: "status", operation: "clear" },
    {
      type: "life_state",
      field: "numberOfChildren",
      operation: "set",
      value: "one",
    },
    {
      type: "football_state",
      field: "isInjured",
      operation: "set",
      value: "yes",
    },
    { type: "counter", key: "attempts", operation: "set", value: -1 },
    { type: "counter", key: "attempts", operation: "increment", value: 0.5 },
    { type: "counter", key: "attempts", operation: "set", value: 0.5 },
  ])("rejects an incompatible effect", (effect) => {
    expect(GameEffectSchema.safeParse(effect).success).toBe(false);
  });

  it.each([
    { operation: "increment", value: -1 },
    { operation: "increment", value: 0 },
    { operation: "increment", value: 1 },
    { operation: "set", value: 0 },
  ])("accepts the valid counter effect %j", ({ operation, value }) => {
    expect(
      GameEffectSchema.safeParse({
        type: "counter",
        key: "attempts",
        operation,
        value,
      }).success,
    ).toBe(true);
  });

  it.each(validHistoryKeys)("accepts the history key %j", (key) => {
    expect(
      GameEffectSchema.safeParse({ type: "flag", key, value: true }).success,
    ).toBe(true);
    expect(
      GameEffectSchema.safeParse({
        type: "counter",
        key,
        operation: "set",
        value: 0,
      }).success,
    ).toBe(true);
  });

  it.each(invalidHistoryKeys)("rejects the history key %j", (key) => {
    expect(
      GameEffectSchema.safeParse({ type: "flag", key, value: true }).success,
    ).toBe(false);
    expect(
      GameEffectSchema.safeParse({
        type: "counter",
        key,
        operation: "increment",
        value: 1,
      }).success,
    ).toBe(false);
  });

  it("uses safe integers for both counter operations", () => {
    for (const operation of ["set", "increment"] as const) {
      expect(
        GameEffectSchema.safeParse({
          type: "counter",
          key: "attempts",
          operation,
          value: Number.MAX_SAFE_INTEGER,
        }).success,
      ).toBe(true);
      expect(
        GameEffectSchema.safeParse({
          type: "counter",
          key: "attempts",
          operation,
          value: Number.MAX_SAFE_INTEGER + 1,
        }).success,
      ).toBe(false);
    }
  });
});
