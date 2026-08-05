import { describe, expect, it } from "vitest";

import {
  EventConditionGroupSchema,
  EventConditionSchema,
  RelationshipSelectorSchema,
  StateConditionSchema,
} from "../../src/index.js";

describe("event conditions", () => {
  it.each([
    { type: "state", field: "stats.mood", operator: "greaterThan", value: 50 },
    { type: "flag", key: "accepted_offer", operator: "equals", value: true },
    { type: "counter", key: "missed_matches", operator: "lessThan", value: 3 },
    {
      type: "relationship",
      mode: "exists",
      selector: { type: "friend" },
      operator: "exists",
    },
    {
      type: "relationship",
      mode: "value",
      selector: { requiredTags: ["supportive"] },
      field: "trust",
      operator: "greaterThanOrEqual",
      value: 70,
    },
    {
      type: "event_history",
      eventId: "first_trial",
      operator: "completedAtLeast",
      count: 1,
    },
  ])("accepts a valid condition variant", (condition) => {
    expect(EventConditionSchema.safeParse(condition).success).toBe(true);
  });

  it.each([
    {
      type: "state",
      field: "life.city",
      operator: "greaterThan",
      value: "Rosario",
    },
    { type: "state", field: "stats.mood", operator: "equals", value: "high" },
    {
      type: "state",
      field: "football.isInjured",
      operator: "lessThan",
      value: false,
    },
    { type: "state", field: "life.lifeStage", operator: "in", value: [] },
  ])("rejects incompatible state operators and values", (condition) => {
    expect(StateConditionSchema.safeParse(condition).success).toBe(false);
  });

  it("rejects arbitrary state fields", () => {
    expect(
      StateConditionSchema.safeParse({
        type: "state",
        field: "profile.name",
        operator: "equals",
        value: "Alex",
      }).success,
    ).toBe(false);
  });

  it("supports existence without a value", () => {
    expect(
      StateConditionSchema.safeParse({
        type: "state",
        field: "life.occupationId",
        operator: "notExists",
      }).success,
    ).toBe(true);
  });

  it.each([
    { mode: "all", conditions: [] },
    { mode: "all", conditions: [{ mode: "any", conditions: [] }] },
  ])("rejects empty and nested groups", (group) => {
    expect(EventConditionGroupSchema.safeParse(group).success).toBe(false);
  });

  it.each([{}, { requiredTags: [] }])(
    "rejects an empty relationship selector",
    (selector) => {
      expect(RelationshipSelectorSchema.safeParse(selector).success).toBe(
        false,
      );
    },
  );

  it("accepts shared selector criteria", () => {
    expect(
      RelationshipSelectorSchema.safeParse({
        relationshipId: "relationship-1",
        type: "friend",
        requiredTags: ["childhood_friend"],
      }).success,
    ).toBe(true);
  });

  it.each([
    { type: "flag", key: "ready", operator: "equals", value: true },
    { type: "flag", key: "ready", operator: "notEquals", value: false },
    { type: "flag", key: "ready", operator: "exists" },
    { type: "flag", key: "ready", operator: "notExists" },
    { type: "event_history", eventId: "first_trial", operator: "completed" },
    {
      type: "event_history",
      eventId: "first_trial",
      operator: "notCompleted",
    },
    {
      type: "event_history",
      eventId: "first_trial",
      operator: "completedAtLeast",
      count: 2,
    },
  ])("accepts the valid flag and history branch", (condition) => {
    expect(EventConditionSchema.safeParse(condition).success).toBe(true);
  });

  it.each([
    {
      type: "relationship",
      mode: "value",
      selector: { type: "friend" },
      field: "isAlive",
      operator: "greaterThan",
      value: true,
    },
    {
      type: "relationship",
      mode: "exists",
      selector: { type: "friend" },
      operator: "exists",
      value: true,
    },
  ])("rejects incompatible relationship conditions", (condition) => {
    expect(EventConditionSchema.safeParse(condition).success).toBe(false);
  });
});
