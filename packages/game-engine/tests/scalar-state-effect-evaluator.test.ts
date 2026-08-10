import {
  AppliedEffectSchema,
  type AppliedEffectSource,
  type FootballAttributeEffect,
  type FootballStateEffect,
  type GameState,
  type LifeStateEffect,
  type PlayerStatEffect,
} from "@amateur-app/shared-types";
import { describe, expect, it } from "vitest";

import { applyScalarOrStateEffect } from "../src/events/effects/apply-scalar-or-state-effect.js";
import { InternalEffectApplicationError } from "../src/events/effects/internal-effect-application-error.js";
import { createInitialGameState } from "../src/index.js";
import { createInput } from "./test-fixtures.js";

type SupportedEffect =
  | PlayerStatEffect
  | FootballAttributeEffect
  | LifeStateEffect
  | FootballStateEffect;

const choiceAudit = {
  source: { phase: "choice" },
  sourceEffectIndex: 2,
} as const;

function validState(): GameState {
  return createInitialGameState(createInput());
}

function apply(
  effect: SupportedEffect,
  state = structuredClone(validState()),
  source: AppliedEffectSource = choiceAudit.source,
) {
  const audit = { source, sourceEffectIndex: choiceAudit.sourceEffectIndex };
  const record = applyScalarOrStateEffect(effect, state, audit);
  return { audit, record, state };
}

function expectPersistible(record: unknown): void {
  expect(AppliedEffectSchema.safeParse(record).success).toBe(true);
}

describe("applyScalarOrStateEffect", () => {
  describe("player_stat", () => {
    const fields = [
      "mood",
      "energy",
      "health",
      "family",
      "friends",
      "finances",
    ] as const;

    it.each(fields)("modifies only %s", (field) => {
      const state = structuredClone(validState());
      const before = structuredClone(state);
      const { record } = apply(
        { type: "player_stat", field, operation: "set", value: 33 },
        state,
      );

      expect(state.stats).toEqual({ ...before.stats, [field]: 33 });
      expect(state.footballAttributes).toEqual(before.footballAttributes);
      expect(record).toMatchObject({
        type: "player_stat",
        status: before.stats[field] === 33 ? "no_change" : "applied",
        previous: { exists: true, value: before.stats[field] },
        resulting: { exists: true, value: 33 },
      });
      expectPersistible(record);
    });

    it.each([
      ["set", 25, 25],
      ["add", 5.5, 65.5],
      ["multiply", 0.5, 30],
    ] as const)("applies %s", (operation, value, expected) => {
      const { record, state } = apply({
        type: "player_stat",
        field: "mood",
        operation,
        value,
      });
      expect(state.stats.mood).toBe(expected);
      expect(record.resulting).toEqual({ exists: true, value: expected });
    });

    it.each([
      ["set", -10, 0, "applied"],
      ["set", 110, 100, "applied"],
      ["add", 0, 60, "no_change"],
      ["multiply", 1, 60, "no_change"],
    ] as const)(
      "%s %s results in %s with %s",
      (operation, value, expected, status) => {
        const { record, state } = apply({
          type: "player_stat",
          field: "mood",
          operation,
          value,
        });
        expect(state.stats.mood).toBe(expected);
        expect(record.status).toBe(status);
      },
    );

    it("reports no_change when clamping returns the current boundary", () => {
      const state = structuredClone(validState());
      state.stats.mood = 100;
      const { record } = apply(
        { type: "player_stat", field: "mood", operation: "add", value: 5 },
        state,
      );
      expect(record.status).toBe("no_change");
    });

    it("reports no_change when setting a negative value from zero", () => {
      const state = structuredClone(validState());
      state.stats.mood = 0;
      const { record } = apply(
        { type: "player_stat", field: "mood", operation: "set", value: -10 },
        state,
      );
      expect(record.status).toBe("no_change");
      expect(record.resulting).toEqual({ exists: true, value: 0 });
    });

    it("rejects arithmetic overflow with family and field context", () => {
      expect(() =>
        apply({
          type: "player_stat",
          field: "mood",
          operation: "multiply",
          value: Number.MAX_VALUE,
        }),
      ).toThrow(/player_stat\.mood/);
    });

    it.each([
      { phase: "choice" } as const,
      { phase: "outcome", outcomeId: "accepted" } as const,
    ])("copies audit source and requested for $phase", (source) => {
      const effect: PlayerStatEffect = {
        type: "player_stat",
        field: "mood",
        operation: "add",
        value: -0,
      };
      const effectBefore = structuredClone(effect);
      const sourceBefore = structuredClone(source);
      const { audit, record } = apply(effect, undefined, source);

      expect(record.requested).toEqual({
        field: "mood",
        operation: "add",
        value: -0,
      });
      expect(record.requested).not.toBe(effect);
      expect(record.source).toEqual(source);
      expect(record.source).not.toBe(source);
      expect(record.sourceEffectIndex).toBe(2);
      expect(effect).toEqual(effectBefore);
      expect(source).toEqual(sourceBefore);
      expect(audit.source).toBe(source);
      expectPersistible(record);
    });
  });

  describe("football_attribute", () => {
    const fields = [
      "talent",
      "technique",
      "physicalCondition",
      "tacticalUnderstanding",
      "discipline",
      "currentForm",
      "potential",
      "injuryRisk",
    ] as const;

    it.each(fields)("modifies only %s and leaves stats unchanged", (field) => {
      const state = structuredClone(validState());
      const before = structuredClone(state);
      const { record } = apply(
        {
          type: "football_attribute",
          field,
          operation: "set",
          value: 33.5,
        },
        state,
      );

      expect(state.footballAttributes).toEqual({
        ...before.footballAttributes,
        [field]: 33.5,
      });
      expect(state.stats).toEqual(before.stats);
      expect(record.requested).toEqual({
        field,
        operation: "set",
        value: 33.5,
      });
      expectPersistible(record);
    });

    it.each([
      ["set", 25, 25],
      ["add", 5, 60],
      ["multiply", 0.5, 27.5],
      ["set", -1, 0],
      ["set", 101, 100],
    ] as const)("applies %s with clamping", (operation, value, expected) => {
      const { state } = apply({
        type: "football_attribute",
        field: "talent",
        operation,
        value,
      });
      expect(state.footballAttributes.talent).toBe(expected);
    });

    it("uses the value produced by a preceding effect", () => {
      const state = structuredClone(validState());
      apply(
        {
          type: "football_attribute",
          field: "technique",
          operation: "set",
          value: 20,
        },
        state,
      );
      const { record } = apply(
        {
          type: "football_attribute",
          field: "technique",
          operation: "multiply",
          value: 2,
        },
        state,
      );
      expect(record.previous).toEqual({ exists: true, value: 20 });
      expect(state.footballAttributes.technique).toBe(40);
    });

    it("does not recalculate footballLevel", () => {
      const state = structuredClone(validState());
      const level = state.stats.footballLevel;
      apply(
        {
          type: "football_attribute",
          field: "technique",
          operation: "add",
          value: 10,
        },
        state,
      );
      expect(state.stats.footballLevel).toBe(level);
    });

    it("returns no_change for an unchanged result", () => {
      const { record } = apply({
        type: "football_attribute",
        field: "talent",
        operation: "multiply",
        value: 1,
      });
      expect(record.status).toBe("no_change");
    });

    it("rejects overflow", () => {
      expect(() =>
        apply({
          type: "football_attribute",
          field: "talent",
          operation: "multiply",
          value: Number.MAX_VALUE,
        }),
      ).toThrow(InternalEffectApplicationError);
    });
  });

  describe("life_state", () => {
    const setCases = [
      ["educationStatus", "university"],
      ["employmentStatus", "part_time"],
      ["relationshipStatus", "dating"],
      ["occupationId", "student"],
      ["employerId", "employer-1"],
      ["city", " Córdoba "],
      ["country", "Uruguay"],
      ["numberOfChildren", 2],
      ["housingStatus", "renting"],
    ] as const;

    it.each(setCases)("sets %s literally", (field, value) => {
      const effect = {
        type: "life_state",
        field,
        operation: "set",
        value,
      } as LifeStateEffect;
      const { record, state } = apply(effect);
      expect(state.life[field]).toBe(value);
      expect(record.status).toBe("applied");
      expect(record.resulting).toEqual({ exists: true, value });
      expectPersistible(record);
    });

    it("returns no_change for the same literal value", () => {
      const { record } = apply({
        type: "life_state",
        field: "city",
        operation: "set",
        value: "Rosario",
      });
      expect(record.status).toBe("no_change");
    });

    it("distinguishes an absent optional property from a present one", () => {
      const state = structuredClone(validState());
      const first = apply(
        {
          type: "life_state",
          field: "occupationId",
          operation: "set",
          value: "student",
        },
        state,
      );
      const second = apply(
        {
          type: "life_state",
          field: "occupationId",
          operation: "set",
          value: "student",
        },
        state,
      );
      expect(first.record.previous).toEqual({ exists: false });
      expect(first.record.status).toBe("applied");
      expect(second.record.status).toBe("no_change");
    });

    it.each([
      [2, 2, "applied"],
      [0, 0, "no_change"],
      [3, 3, "applied"],
    ] as const)("adds %s children", (value, expected, status) => {
      const state = structuredClone(validState());
      if (value === 3) state.life.numberOfChildren = 6;
      const expectedResult = value === 3 ? 9 : expected;
      const { record } = apply(
        {
          type: "life_state",
          field: "numberOfChildren",
          operation: "add",
          value,
        },
        state,
      );
      expect(state.life.numberOfChildren).toBe(expectedResult);
      expect(record.status).toBe(status);
    });

    it("allows a negative addition without underflow", () => {
      const state = structuredClone(validState());
      state.life.numberOfChildren = 3;
      const { record } = apply(
        {
          type: "life_state",
          field: "numberOfChildren",
          operation: "add",
          value: -2,
        },
        state,
      );
      expect(state.life.numberOfChildren).toBe(1);
      expect(record.status).toBe("applied");
    });

    it.each([-1, Number.NaN])(
      "rejects invalid children result from %s without writing",
      (value) => {
        const state = structuredClone(validState());
        expect(() =>
          apply(
            {
              type: "life_state",
              field: "numberOfChildren",
              operation: "add",
              value,
            },
            state,
          ),
        ).toThrow(InternalEffectApplicationError);
        expect(state.life.numberOfChildren).toBe(0);
      },
    );

    it.each(["occupationId", "employerId"] as const)(
      "clears present %s with delete",
      (field) => {
        const state = structuredClone(validState());
        state.life[field] = "value";
        const { record } = apply(
          { type: "life_state", field, operation: "clear" },
          state,
        );
        expect(Object.hasOwn(state.life, field)).toBe(false);
        expect(record).toMatchObject({
          status: "applied",
          previous: { exists: true, value: "value" },
          resulting: { exists: false },
        });
        expect("value" in record.resulting).toBe(false);
      },
    );

    it.each(["occupationId", "employerId"] as const)(
      "returns no_change when %s is absent",
      (field) => {
        const { record } = apply({
          type: "life_state",
          field,
          operation: "clear",
        });
        expect(record.status).toBe("no_change");
        expect(record.previous).toEqual({ exists: false });
        expect(record.resulting).toEqual({ exists: false });
      },
    );

    it("does not apply cascades", () => {
      const state = structuredClone(validState());
      state.life.occupationId = "student";
      state.life.employerId = "school";
      apply(
        {
          type: "life_state",
          field: "employmentStatus",
          operation: "set",
          value: "unemployed",
        },
        state,
      );
      expect(state.life.occupationId).toBe("student");
      expect(state.life.employerId).toBe("school");
      expect(state.life.relationshipStatus).toBe("single");
    });
  });

  describe("football_state", () => {
    const setCases = [
      ["status", "academy"],
      ["careerType", "professional_path"],
      ["currentTeamId", "team-1"],
      ["currentClubId", "club-1"],
      ["currentContractId", "contract-1"],
      ["currentAgentId", "agent-1"],
      ["teamRole", "starter"],
      ["teamTrust", 40],
      ["coachTrust", 41],
      ["professionalReputation", 42],
      ["amateurReputation", 43],
      ["salary", 1000.5],
      ["marketValue", 5000.25],
      ["isInjured", true],
      ["currentInjuryId", "injury-1"],
      ["retirementStatus", "considering"],
    ] as const;

    it.each(setCases)("sets %s", (field, value) => {
      const effect = {
        type: "football_state",
        field,
        operation: "set",
        value,
      } as FootballStateEffect;
      const { record, state } = apply(effect);
      expect(state.football[field]).toBe(value);
      expect(record.status).toBe("applied");
      expect(record.resulting).toEqual({ exists: true, value });
      expectPersistible(record);
    });

    it.each([
      "teamTrust",
      "coachTrust",
      "professionalReputation",
      "amateurReputation",
      "salary",
      "marketValue",
    ] as const)("adds to %s", (field) => {
      const state = structuredClone(validState());
      const previous = state.football[field];
      const { record } = apply(
        {
          type: "football_state",
          field,
          operation: "add",
          value: 2.5,
        },
        state,
      );
      expect(state.football[field]).toBe(previous + 2.5);
      expect(record.previous).toEqual({ exists: true, value: previous });
      expect(record.status).toBe("applied");
    });

    it.each([
      "currentTeamId",
      "currentClubId",
      "currentContractId",
      "currentAgentId",
      "currentInjuryId",
    ] as const)("clears %s using delete", (field) => {
      const state = structuredClone(validState());
      state.football[field] = "id";
      const { record } = apply(
        { type: "football_state", field, operation: "clear" },
        state,
      );
      expect(Object.hasOwn(state.football, field)).toBe(false);
      expect(record.status).toBe("applied");
      expect(record.resulting).toEqual({ exists: false });
    });

    it.each([
      "currentTeamId",
      "currentClubId",
      "currentContractId",
      "currentAgentId",
      "currentInjuryId",
    ] as const)("does not change when clearing absent %s", (field) => {
      const { record } = apply({
        type: "football_state",
        field,
        operation: "clear",
      });
      expect(record.status).toBe("no_change");
      expect(record.previous).toEqual({ exists: false });
    });

    it("distinguishes absent, equal and different optional IDs", () => {
      const state = structuredClone(validState());
      const effect: FootballStateEffect = {
        type: "football_state",
        field: "currentTeamId",
        operation: "set",
        value: "team-1",
      };
      expect(apply(effect, state).record.status).toBe("applied");
      expect(apply(effect, state).record.status).toBe("no_change");
      expect(apply({ ...effect, value: "team-2" }, state).record.status).toBe(
        "applied",
      );
    });

    it.each([
      ["teamTrust", 150, 100],
      ["coachTrust", -10, 0],
      ["professionalReputation", 0, 0],
      ["amateurReputation", -1, 0],
    ] as const)("clamps %s additions", (field, value, expected) => {
      const { state, record } = apply({
        type: "football_state",
        field,
        operation: "add",
        value,
      });
      expect(state.football[field]).toBe(expected);
      expect(record.status).toBe(expected === 0 ? "no_change" : "applied");
    });

    it("clamps economy at zero without an upper maximum", () => {
      const state = structuredClone(validState());
      const first = apply(
        {
          type: "football_state",
          field: "salary",
          operation: "add",
          value: -10,
        },
        state,
      );
      const second = apply(
        {
          type: "football_state",
          field: "marketValue",
          operation: "add",
          value: 100.5,
        },
        state,
      );
      expect(first.record.status).toBe("no_change");
      expect(state.football.salary).toBe(0);
      expect(state.football.marketValue).toBe(100.5);
      expect(second.record.status).toBe("applied");
    });

    it("rejects economy overflow without writing", () => {
      const state = structuredClone(validState());
      state.football.salary = Number.MAX_VALUE;
      expect(() =>
        apply(
          {
            type: "football_state",
            field: "salary",
            operation: "add",
            value: Number.MAX_VALUE,
          },
          state,
        ),
      ).toThrow(/football_state\.salary/);
      expect(state.football.salary).toBe(Number.MAX_VALUE);
    });

    it("treats false literally", () => {
      const state = structuredClone(validState());
      state.football.isInjured = true;
      state.football.currentInjuryId = "injury-1";
      const { record } = apply(
        {
          type: "football_state",
          field: "isInjured",
          operation: "set",
          value: false,
        },
        state,
      );
      expect(record.status).toBe("applied");
      expect(record.resulting).toEqual({ exists: true, value: false });
      expect(state.football.currentInjuryId).toBe("injury-1");
    });

    it("allows temporary injury inconsistency without cascades", () => {
      const { state } = apply({
        type: "football_state",
        field: "isInjured",
        operation: "set",
        value: true,
      });
      expect(state.football.isInjured).toBe(true);
      expect(state.football.currentInjuryId).toBeUndefined();
    });

    it("allows temporary retirement inconsistency without cascades", () => {
      const { state } = apply({
        type: "football_state",
        field: "retirementStatus",
        operation: "set",
        value: "permanently_retired",
      });
      expect(state.football.retirementStatus).toBe("permanently_retired");
      expect(state.football.status).toBe("without_team");
      expect(state.football.salary).toBe(0);
    });
  });

  it("does not mutate effect or audit and is deterministic", () => {
    const effect: PlayerStatEffect = {
      type: "player_stat",
      field: "energy",
      operation: "add",
      value: -5,
    };
    const source: AppliedEffectSource = {
      phase: "outcome",
      outcomeId: "tired",
    };
    const effectBefore = structuredClone(effect);
    const sourceBefore = structuredClone(source);
    const first = apply(effect, undefined, source);
    const second = apply(effect, undefined, source);

    expect(first.state).toEqual(second.state);
    expect(first.record).toEqual(second.record);
    expect(effect).toEqual(effectBefore);
    expect(source).toEqual(sourceBefore);
    expect(first.record.source).not.toBe(source);
  });
});
