import { describe, expect, expectTypeOf, it } from "vitest";

import {
  EventConditionGroupSchema,
  EventConditionSchema,
  RelationshipSelectorSchema,
  StateConditionSchema,
  type AllowedStateConditionField,
  type StateCondition,
} from "../../src/index.js";

const EXPECTED_STATE_FIELDS = [
  "stats.mood",
  "stats.energy",
  "stats.health",
  "stats.family",
  "stats.friends",
  "stats.finances",
  "stats.footballLevel",
  "footballAttributes.talent",
  "footballAttributes.technique",
  "footballAttributes.physicalCondition",
  "footballAttributes.tacticalUnderstanding",
  "footballAttributes.discipline",
  "footballAttributes.currentForm",
  "footballAttributes.potential",
  "footballAttributes.injuryRisk",
  "life.age",
  "life.currentYear",
  "life.lifeStage",
  "life.educationStatus",
  "life.employmentStatus",
  "life.relationshipStatus",
  "life.occupationId",
  "life.employerId",
  "life.city",
  "life.country",
  "life.numberOfChildren",
  "life.housingStatus",
  "football.status",
  "football.careerType",
  "football.currentTeamId",
  "football.currentClubId",
  "football.currentContractId",
  "football.currentAgentId",
  "football.teamRole",
  "football.teamTrust",
  "football.coachTrust",
  "football.professionalReputation",
  "football.amateurReputation",
  "football.salary",
  "football.marketValue",
  "football.isInjured",
  "football.retirementStatus",
  "currentSeason",
  "currentTurn",
] as const satisfies readonly AllowedStateConditionField[];

type ExpectedStateField = (typeof EXPECTED_STATE_FIELDS)[number];

describe("event conditions", () => {
  it("preserves exact state condition correlations at compile time", () => {
    expect(EXPECTED_STATE_FIELDS).toHaveLength(44);
    expectTypeOf<AllowedStateConditionField>().toEqualTypeOf<ExpectedStateField>();
    expectTypeOf<AllowedStateConditionField>().toMatchTypeOf<string>();
    expectTypeOf<string>().not.toMatchTypeOf<AllowedStateConditionField>();

    const numeric = {
      type: "state",
      field: "stats.mood",
      operator: "greaterThan",
      value: 50,
    } as const satisfies StateCondition;
    const boolean = {
      type: "state",
      field: "football.isInjured",
      operator: "equals",
      value: false,
    } as const satisfies StateCondition;
    const lifeStage = {
      type: "state",
      field: "life.lifeStage",
      operator: "equals",
      value: "adolescence",
    } as const satisfies StateCondition;
    const optionalExistence = {
      type: "state",
      field: "life.occupationId",
      operator: "notExists",
    } as const satisfies StateCondition;

    // @ts-expect-error arbitrary fields are not state condition fields
    const invalidField: AllowedStateConditionField = "made.up.field";

    const numericString = {
      type: "state",
      field: "stats.mood",
      operator: "equals",
      value: "high",
    } as const;
    // @ts-expect-error numeric state fields require numeric values
    const invalidNumeric: StateCondition = numericString;

    const booleanNumber = {
      type: "state",
      field: "football.isInjured",
      operator: "equals",
      value: 1,
    } as const;
    // @ts-expect-error boolean state fields require boolean values
    const invalidBooleanValue: StateCondition = booleanNumber;

    const freeStringNumber = {
      type: "state",
      field: "life.occupationId",
      operator: "equals",
      value: 1,
    } as const;
    // @ts-expect-error free string state fields require string values
    const invalidFreeStringValue: StateCondition = freeStringNumber;

    const invalidLifeStageValue = {
      type: "state",
      field: "life.lifeStage",
      operator: "equals",
      value: "academy",
    } as const;
    // @ts-expect-error lifeStage values remain correlated to LifeStageSchema
    const invalidLifeStage: StateCondition = invalidLifeStageValue;

    const invalidLifeStageMembership = {
      type: "state" as const,
      field: "life.lifeStage" as const,
      operator: "in" as const,
      value: ["academy"],
    };
    // @ts-expect-error lifeStage membership values remain correlated
    const invalidLifeStageIn: StateCondition = invalidLifeStageMembership;

    const invalidFootballStatusValue = {
      type: "state",
      field: "football.status",
      operator: "equals",
      value: "adolescence",
    } as const;
    // @ts-expect-error football status does not accept life stage values
    const invalidFootballStatus: StateCondition = invalidFootballStatusValue;

    const booleanComparator = {
      type: "state",
      field: "football.isInjured",
      operator: "greaterThan",
      value: true,
    } as const;
    // @ts-expect-error boolean state fields do not accept numeric comparators
    const invalidBooleanOperator: StateCondition = booleanComparator;

    const stringComparator = {
      type: "state",
      field: "life.city",
      operator: "greaterThan",
      value: "Rosario",
    } as const;
    // @ts-expect-error string state fields do not accept numeric comparators
    const invalidStringOperator: StateCondition = stringComparator;

    const enumComparator = {
      type: "state",
      field: "life.lifeStage",
      operator: "greaterThan",
      value: "adolescence",
    } as const;
    // @ts-expect-error enum state fields do not accept numeric comparators
    const invalidEnumOperator: StateCondition = enumComparator;

    const invalidExistence: StateCondition = {
      type: "state",
      field: "life.occupationId",
      operator: "notExists",
      // @ts-expect-error existence conditions do not contain value
      value: "unexpected",
    };

    expect([
      numeric,
      boolean,
      lifeStage,
      optionalExistence,
      invalidField,
      invalidNumeric,
      invalidBooleanValue,
      invalidFreeStringValue,
      invalidLifeStage,
      invalidLifeStageIn,
      invalidFootballStatus,
      invalidBooleanOperator,
      invalidStringOperator,
      invalidEnumOperator,
      invalidExistence,
    ]).toHaveLength(15);
  });

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
    {
      type: "state",
      field: "life.lifeStage",
      operator: "equals",
      value: "academy",
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

  it("accepts a fractional counter comparison threshold", () => {
    expect(
      EventConditionSchema.safeParse({
        type: "counter",
        key: "attempts",
        operator: "greaterThan",
        value: 1.5,
      }).success,
    ).toBe(true);
  });

  it.each(["accepted_offer", "counter_2", "2_attempts"])(
    "shares the valid history key policy for %j",
    (key) => {
      expect(
        EventConditionSchema.safeParse({
          type: "flag",
          key,
          operator: "exists",
        }).success,
      ).toBe(true);
      expect(
        EventConditionSchema.safeParse({
          type: "counter",
          key,
          operator: "equals",
          value: 0,
        }).success,
      ).toBe(true);
    },
  );

  it.each(["", "__proto__", "prototype", "constructor", "with-dash"])(
    "shares the invalid history key policy for %j",
    (key) => {
      expect(
        EventConditionSchema.safeParse({
          type: "flag",
          key,
          operator: "exists",
        }).success,
      ).toBe(false);
      expect(
        EventConditionSchema.safeParse({
          type: "counter",
          key,
          operator: "equals",
          value: 0,
        }).success,
      ).toBe(false);
    },
  );

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
