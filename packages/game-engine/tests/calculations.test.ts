import { describe, expect, it } from "vitest";

import {
  calculateBurnout,
  calculateFamilySupport,
  calculateFootballLevel,
  calculateLifeStage,
  clampStat,
} from "../src/index.js";
import { createRelationship } from "./test-fixtures.js";

describe("domain calculations", () => {
  it.each([
    [-10, 0],
    [42, 42],
    [110, 100],
  ])("clamps %s to %s", (input, expected) => {
    expect(clampStat(input)).toBe(expected);
  });

  it("calculates and rounds football level", () => {
    expect(
      calculateFootballLevel({
        talent: 55,
        technique: 42,
        physicalCondition: 60,
        tacticalUnderstanding: 32,
        discipline: 50,
        currentForm: 50,
        potential: 65,
        injuryRisk: 15,
      }),
    ).toBe(47);
  });

  it("does not include potential, discipline or injury risk in football level", () => {
    const common = {
      talent: 50,
      technique: 50,
      physicalCondition: 50,
      tacticalUnderstanding: 50,
      currentForm: 50,
    };
    const low = calculateFootballLevel({
      ...common,
      discipline: 0,
      potential: 0,
      injuryRisk: 0,
    });
    const high = calculateFootballLevel({
      ...common,
      discipline: 100,
      potential: 100,
      injuryRisk: 100,
    });
    expect(low).toBe(high);
  });

  it("calculates burnout", () => {
    expect(calculateBurnout({ mood: 50, energy: 25, health: 100 })).toBe(50);
  });

  it.each([
    [{ mood: 100, energy: 100, health: 100 }, 0],
    [{ mood: 0, energy: 0, health: 0 }, 100],
  ])("calculates burnout at an exact boundary", (stats, expected) => {
    expect(calculateBurnout(stats)).toBe(expected);
  });

  it("returns zero family support without eligible relationships", () => {
    expect(calculateFamilySupport([])).toBe(0);
    expect(
      calculateFamilySupport([createRelationship({ type: "friend" })]),
    ).toBe(0);
  });

  it("uses only active and living family relationships", () => {
    expect(
      calculateFamilySupport([
        createRelationship(),
        createRelationship({ id: "inactive", isActive: false, affection: 0 }),
        createRelationship({ id: "dead", isAlive: false, affection: 0 }),
      ]),
    ).toBe(64.5);
  });

  it("clamps the final family support average", () => {
    expect(
      calculateFamilySupport([
        createRelationship({ affection: 0, trust: 0, conflict: 100 }),
      ]),
    ).toBe(0);
  });

  it.each([
    [14, "adolescence"],
    [17, "adolescence"],
    [18, "early_adulthood"],
    [23, "early_adulthood"],
    [24, "adulthood"],
    [30, "adulthood"],
    [31, "maturity"],
    [36, "maturity"],
    [37, "late_career"],
  ] as const)("maps age %s to %s", (age, expected) => {
    expect(calculateLifeStage(age)).toBe(expected);
  });

  it("rejects invalid ages for life-stage calculation", () => {
    expect(() => calculateLifeStage(13)).toThrow(RangeError);
    expect(() => calculateLifeStage(14.5)).toThrow(RangeError);
  });
});
