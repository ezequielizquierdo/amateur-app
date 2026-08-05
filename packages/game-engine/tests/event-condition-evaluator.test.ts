import {
  EventConditionSchema,
  type AllowedStateConditionField,
  type EventCondition,
} from "@amateur-app/shared-types";
import { describe, expect, it } from "vitest";

import * as gameEngine from "../src/index.js";
import {
  createInitialGameState,
  evaluateEventCondition,
  evaluateEventConditionGroup,
} from "../src/index.js";
import { createInput, createRelationship } from "./test-fixtures.js";

function parsedCondition(value: unknown): EventCondition {
  return EventConditionSchema.parse(value);
}

function evaluate(
  value: unknown,
  state = createInitialGameState(createInput()),
) {
  return evaluateEventCondition(parsedCondition(value), state);
}

const ALL_STATE_FIELDS: AllowedStateConditionField[] = [
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
];

describe("event condition evaluator", () => {
  describe("state conditions", () => {
    it.each([
      ["equals", 60, true],
      ["notEquals", 59, true],
      ["greaterThan", 59, true],
      ["greaterThanOrEqual", 60, true],
      ["lessThan", 61, true],
      ["lessThanOrEqual", 60, true],
    ] as const)(
      "evaluates numeric operator %s",
      (operator, value, expected) => {
        expect(
          evaluate({
            type: "state",
            field: "stats.mood",
            operator,
            value,
          }),
        ).toBe(expected);
      },
    );

    it("uses strict equality for strings and enums", () => {
      expect(
        evaluate({
          type: "state",
          field: "life.city",
          operator: "equals",
          value: "Rosario",
        }),
      ).toBe(true);
      expect(
        evaluate({
          type: "state",
          field: "life.city",
          operator: "equals",
          value: " Rosario ",
        }),
      ).toBe(false);
      expect(
        evaluate({
          type: "state",
          field: "life.lifeStage",
          operator: "equals",
          value: "adolescence",
        }),
      ).toBe(true);
    });

    it("evaluates booleans without truthiness", () => {
      expect(
        evaluate({
          type: "state",
          field: "football.isInjured",
          operator: "equals",
          value: false,
        }),
      ).toBe(true);
      expect(
        evaluate({
          type: "state",
          field: "football.isInjured",
          operator: "notEquals",
          value: false,
        }),
      ).toBe(false);
    });

    it("evaluates in and notIn with strict membership", () => {
      expect(
        evaluate({
          type: "state",
          field: "football.status",
          operator: "in",
          value: ["academy", "without_team"],
        }),
      ).toBe(true);
      expect(
        evaluate({
          type: "state",
          field: "football.status",
          operator: "notIn",
          value: ["academy", "professional"],
        }),
      ).toBe(true);
    });

    it("distinguishes present and absent optional fields", () => {
      const present = createInitialGameState(createInput());
      present.life.occupationId = "student";

      expect(
        evaluate(
          {
            type: "state",
            field: "life.occupationId",
            operator: "exists",
          },
          present,
        ),
      ).toBe(true);
      expect(
        evaluate(
          {
            type: "state",
            field: "life.occupationId",
            operator: "equals",
            value: "student",
          },
          present,
        ),
      ).toBe(true);

      expect(
        evaluate({
          type: "state",
          field: "life.occupationId",
          operator: "notExists",
        }),
      ).toBe(true);
      expect(
        evaluate({
          type: "state",
          field: "life.occupationId",
          operator: "notEquals",
          value: "student",
        }),
      ).toBe(false);
      expect(
        evaluate({
          type: "state",
          field: "life.occupationId",
          operator: "notIn",
          value: ["student"],
        }),
      ).toBe(false);
    });

    it.each(ALL_STATE_FIELDS)("resolves allowed field %s", (field) => {
      expect(evaluate({ type: "state", field, operator: "exists" })).toBeTypeOf(
        "boolean",
      );
    });

    it("rejects arbitrary paths", () => {
      expect(() =>
        evaluateEventCondition(
          {
            type: "state",
            field: "profile.name",
            operator: "exists",
          },
          createInitialGameState(createInput()),
        ),
      ).toThrow();
    });
  });

  describe("flag conditions", () => {
    it.each([
      ["exists", undefined, false],
      ["notExists", undefined, true],
      ["equals", true, false],
      ["notEquals", true, false],
    ] as const)(
      "evaluates absent flag with %s",
      (operator, value, expected) => {
        const condition =
          value === undefined
            ? { type: "flag", key: "missing", operator }
            : { type: "flag", key: "missing", operator, value };
        expect(evaluate(condition)).toBe(expected);
      },
    );

    it.each([
      ["boolean_true", true],
      ["boolean_false", false],
      ["zero", 0],
      ["empty", ""],
    ] as const)("treats present falsy flag %s as present", (key, value) => {
      const state = createInitialGameState(createInput());
      state.history.flags[key] = value;
      expect(evaluate({ type: "flag", key, operator: "exists" }, state)).toBe(
        true,
      );
      expect(
        evaluate({ type: "flag", key, operator: "equals", value }, state),
      ).toBe(true);
      expect(
        evaluate({ type: "flag", key, operator: "notEquals", value }, state),
      ).toBe(false);
    });
  });

  describe("counter conditions", () => {
    it.each([
      ["equals", 0, true],
      ["notEquals", 1, true],
      ["greaterThan", 0, false],
      ["greaterThanOrEqual", 0, true],
      ["lessThan", 1, true],
      ["lessThanOrEqual", 0, true],
    ] as const)(
      "treats an absent counter as zero for %s",
      (operator, value, expected) => {
        expect(
          evaluate({
            type: "counter",
            key: "missing",
            operator,
            value,
          }),
        ).toBe(expected);
      },
    );

    it.each([
      [0, "equals", 0, true],
      [3, "greaterThan", 2, true],
      [3, "greaterThanOrEqual", 3, true],
      [3, "lessThan", 4, true],
      [3, "lessThanOrEqual", 3, true],
      [3, "notEquals", 4, true],
    ] as const)(
      "evaluates stored counter %s with %s",
      (actual, operator, value, expected) => {
        const state = createInitialGameState(createInput());
        state.history.counters.attempts = actual;
        expect(
          evaluate(
            { type: "counter", key: "attempts", operator, value },
            state,
          ),
        ).toBe(expected);
      },
    );
  });

  describe("relationship conditions", () => {
    it("matches selectors by id, type and every required tag", () => {
      const state = createInitialGameState(
        createInput({
          initialRelationships: [
            createRelationship({
              id: "friend-1",
              type: "friend",
              tags: ["childhood", "supportive"],
            }),
          ],
        }),
      );

      expect(
        evaluate(
          {
            type: "relationship",
            mode: "exists",
            selector: { relationshipId: "friend-1" },
            operator: "exists",
          },
          state,
        ),
      ).toBe(true);
      expect(
        evaluate(
          {
            type: "relationship",
            mode: "exists",
            selector: { type: "friend" },
            operator: "exists",
          },
          state,
        ),
      ).toBe(true);
      expect(
        evaluate(
          {
            type: "relationship",
            mode: "exists",
            selector: { requiredTags: ["supportive", "childhood"] },
            operator: "exists",
          },
          state,
        ),
      ).toBe(true);
      expect(
        evaluate(
          {
            type: "relationship",
            mode: "exists",
            selector: { requiredTags: ["supportive", "missing"] },
            operator: "exists",
          },
          state,
        ),
      ).toBe(false);
      expect(
        evaluate(
          {
            type: "relationship",
            mode: "exists",
            selector: {
              relationshipId: "friend-1",
              type: "friend",
              requiredTags: ["supportive"],
            },
            operator: "exists",
          },
          state,
        ),
      ).toBe(true);
    });

    it("implements exists and notExists when nothing matches", () => {
      expect(
        evaluate({
          type: "relationship",
          mode: "exists",
          selector: { type: "agent" },
          operator: "notExists",
        }),
      ).toBe(true);
    });

    it.each([
      ["affection", "greaterThan", 70],
      ["trust", "equals", 70],
      ["conflict", "lessThan", 20],
      ["isActive", "equals", true],
      ["isAlive", "equals", true],
    ] as const)("evaluates relationship field %s", (field, operator, value) => {
      const state = createInitialGameState(
        createInput({ initialRelationships: [createRelationship()] }),
      );
      expect(
        evaluate(
          {
            type: "relationship",
            mode: "value",
            selector: { type: "mother" },
            field,
            operator,
            value,
          },
          state,
        ),
      ).toBe(true);
    });

    it("uses any-match semantics across multiple relationships", () => {
      const state = createInitialGameState(
        createInput({
          initialRelationships: [
            createRelationship({ id: "low", affection: 20 }),
            createRelationship({ id: "high", affection: 90 }),
          ],
        }),
      );
      expect(
        evaluate(
          {
            type: "relationship",
            mode: "value",
            selector: { type: "mother" },
            field: "affection",
            operator: "greaterThan",
            value: 80,
          },
          state,
        ),
      ).toBe(true);
    });

    it("does not exclude inactive or deceased relationships", () => {
      const state = createInitialGameState(
        createInput({
          initialRelationships: [
            createRelationship({ isActive: false, isAlive: false }),
          ],
        }),
      );
      expect(
        evaluate(
          {
            type: "relationship",
            mode: "value",
            selector: { type: "mother" },
            field: "isActive",
            operator: "equals",
            value: false,
          },
          state,
        ),
      ).toBe(true);
      expect(
        evaluate(
          {
            type: "relationship",
            mode: "value",
            selector: { type: "mother" },
            field: "isAlive",
            operator: "equals",
            value: false,
          },
          state,
        ),
      ).toBe(true);
    });
  });

  describe("event history conditions", () => {
    function decision(eventId: string, eventVersion: number, choiceId: string) {
      return {
        eventId,
        eventVersion,
        choiceId,
        age: 14,
        season: 1,
        turn: 0,
        immediateEffects: [],
      };
    }

    it("evaluates never completed events", () => {
      expect(
        evaluate({
          type: "event_history",
          eventId: "first_trial",
          operator: "completed",
        }),
      ).toBe(false);
      expect(
        evaluate({
          type: "event_history",
          eventId: "first_trial",
          operator: "notCompleted",
        }),
      ).toBe(true);
    });

    it("counts each matching decision regardless of version, choice or outcome", () => {
      const state = createInitialGameState(createInput());
      state.history.decisions.push(
        decision("first_trial", 1, "attend_trial"),
        {
          ...decision("first_trial", 2, "try_again"),
          outcomeId: "accepted",
        },
        decision("other_event", 1, "continue"),
      );
      state.history.completedEventIds = [];

      expect(
        evaluate(
          {
            type: "event_history",
            eventId: "first_trial",
            operator: "completed",
          },
          state,
        ),
      ).toBe(true);
      expect(
        evaluate(
          {
            type: "event_history",
            eventId: "first_trial",
            operator: "completedAtLeast",
            count: 2,
          },
          state,
        ),
      ).toBe(true);
      expect(
        evaluate(
          {
            type: "event_history",
            eventId: "first_trial",
            operator: "completedAtLeast",
            count: 3,
          },
          state,
        ),
      ).toBe(false);
    });

    it("ignores divergent completedEventIds", () => {
      const state = createInitialGameState(createInput());
      state.history.completedEventIds = ["first_trial"];
      expect(
        evaluate(
          {
            type: "event_history",
            eventId: "first_trial",
            operator: "completed",
          },
          state,
        ),
      ).toBe(false);
    });
  });

  describe("condition groups", () => {
    const trueCondition = parsedCondition({
      type: "state",
      field: "life.age",
      operator: "equals",
      value: 14,
    });
    const falseCondition = parsedCondition({
      type: "state",
      field: "life.age",
      operator: "equals",
      value: 15,
    });

    it.each([
      ["all", [trueCondition, trueCondition], true],
      ["all", [trueCondition, falseCondition], false],
      ["any", [falseCondition, trueCondition], true],
      ["any", [falseCondition, falseCondition], false],
    ] as const)("combines mode %s", (mode, conditions, expected) => {
      expect(
        evaluateEventConditionGroup(
          { mode, conditions: [...conditions] },
          createInitialGameState(createInput()),
        ),
      ).toBe(expected);
    });

    it.each([
      [[trueCondition], false],
      [[falseCondition], true],
    ] as const)("negates the combined result", (conditions, expected) => {
      expect(
        evaluateEventConditionGroup(
          { mode: "all", conditions: [...conditions], negate: true },
          createInitialGameState(createInput()),
        ),
      ).toBe(expected);
    });
  });

  describe("validation, purity and API", () => {
    it("rejects invalid condition, group and state inputs", () => {
      const state = createInitialGameState(createInput());
      expect(() =>
        evaluateEventCondition(
          { type: "unknown" } as unknown as EventCondition,
          state,
        ),
      ).toThrow();
      expect(() =>
        evaluateEventConditionGroup({ mode: "all", conditions: [] }, state),
      ).toThrow();

      const invalidState = createInitialGameState(createInput());
      invalidState.stats.mood = 101;
      expect(() =>
        evaluate(
          {
            type: "state",
            field: "stats.mood",
            operator: "equals",
            value: 101,
          },
          invalidState,
        ),
      ).toThrow();
    });

    it("does not mutate inputs and remains deterministic", () => {
      const state = createInitialGameState(
        createInput({ initialRelationships: [createRelationship()] }),
      );
      const condition = parsedCondition({
        type: "relationship",
        mode: "value",
        selector: { type: "mother", requiredTags: ["supportive"] },
        field: "trust",
        operator: "greaterThan",
        value: 60,
      });
      const stateSnapshot = structuredClone(state);
      const conditionSnapshot = structuredClone(condition);

      const first = evaluateEventCondition(condition, state);
      const second = evaluateEventCondition(condition, state);

      expect(first).toBe(true);
      expect(second).toBe(first);
      expect(state).toEqual(stateSnapshot);
      expect(condition).toEqual(conditionSnapshot);
    });

    it("exports only the public condition evaluator API", () => {
      expect(gameEngine.evaluateEventCondition).toBeTypeOf("function");
      expect(gameEngine.evaluateEventConditionGroup).toBeTypeOf("function");
      expect(gameEngine).not.toHaveProperty("selectStateField");
      expect(gameEngine).not.toHaveProperty("evaluateValidatedEventCondition");
    });
  });
});
