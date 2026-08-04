import type {
  ChallengingTrait,
  FootballAttributes,
  PlayerStats,
  PositiveTrait,
} from "@amateur-app/shared-types";
import { describe, expect, it } from "vitest";

import { applyInitialTraits } from "../src/index.js";
import {
  BASE_FOOTBALL_ATTRIBUTES,
  BASE_STATS,
} from "../src/initial-state/base-values.js";
import {
  CHALLENGING_TRAIT_MODIFIERS,
  POSITIVE_TRAIT_MODIFIERS,
} from "../src/initial-state/trait-modifiers.js";

type TraitExpectation = {
  stats?: Partial<PlayerStats>;
  footballAttributes?: Partial<FootballAttributes>;
};

const POSITIVE_CASES: readonly [PositiveTrait, TraitExpectation][] = [
  ["disciplined", { footballAttributes: { discipline: 57 } }],
  ["talented", { footballAttributes: { talent: 70, potential: 75 } }],
  ["sociable", { stats: { friends: 77 } }],
  ["resilient", { stats: { mood: 80 } }],
  ["ambitious", { footballAttributes: { discipline: 47, potential: 73 } }],
  ["family_oriented", { stats: { family: 77 } }],
];

const CHALLENGING_CASES: readonly [ChallengingTrait, TraitExpectation][] = [
  ["impulsive", { footballAttributes: { discipline: 42 } }],
  ["undisciplined", { footballAttributes: { discipline: 32 } }],
  ["insecure", { stats: { mood: 60 } }],
  ["individualistic", { stats: { friends: 69 } }],
  [
    "injury_prone",
    {
      stats: { health: 80 },
      footballAttributes: { injuryRisk: 35 },
    },
  ],
  [
    "low_frustration_tolerance",
    {
      stats: { mood: 62 },
      footballAttributes: { discipline: 46 },
    },
  ],
];

describe("initial trait modifiers", () => {
  it("keeps all internal factory configuration frozen at runtime", () => {
    expect(Object.isFrozen(BASE_STATS)).toBe(true);
    expect(Object.isFrozen(BASE_FOOTBALL_ATTRIBUTES)).toBe(true);
    expect(Object.isFrozen(POSITIVE_TRAIT_MODIFIERS)).toBe(true);
    expect(Object.isFrozen(CHALLENGING_TRAIT_MODIFIERS)).toBe(true);

    for (const modifier of [
      ...Object.values(POSITIVE_TRAIT_MODIFIERS),
      ...Object.values(CHALLENGING_TRAIT_MODIFIERS),
    ]) {
      expect(Object.isFrozen(modifier)).toBe(true);
      if (modifier.stats !== undefined) {
        expect(Object.isFrozen(modifier.stats)).toBe(true);
      }
      if (modifier.footballAttributes !== undefined) {
        expect(Object.isFrozen(modifier.footballAttributes)).toBe(true);
      }
    }
  });

  it.each(POSITIVE_CASES)(
    "applies only the documented changes for positive trait %s",
    (trait, expected) => {
      const stats = { ...BASE_STATS };
      const footballAttributes = { ...BASE_FOOTBALL_ATTRIBUTES };
      const statsSnapshot = { ...stats };
      const attributesSnapshot = { ...footballAttributes };

      const result = applyInitialTraits(
        stats,
        footballAttributes,
        trait,
        "impulsive",
      );

      expect(result).toEqual({
        stats: { ...BASE_STATS, ...expected.stats },
        footballAttributes: {
          ...BASE_FOOTBALL_ATTRIBUTES,
          discipline: 42,
          ...expected.footballAttributes,
        },
      });
      expect(stats).toEqual(statsSnapshot);
      expect(footballAttributes).toEqual(attributesSnapshot);
    },
  );

  it.each(CHALLENGING_CASES)(
    "applies only the documented changes for challenging trait %s",
    (trait, expected) => {
      const stats = { ...BASE_STATS };
      const footballAttributes = { ...BASE_FOOTBALL_ATTRIBUTES };
      const statsSnapshot = { ...stats };
      const attributesSnapshot = { ...footballAttributes };

      const result = applyInitialTraits(
        stats,
        footballAttributes,
        "sociable",
        trait,
      );

      expect(result).toEqual({
        stats: { ...BASE_STATS, friends: 77, ...expected.stats },
        footballAttributes: {
          ...BASE_FOOTBALL_ATTRIBUTES,
          ...expected.footballAttributes,
        },
      });
      expect(stats).toEqual(statsSnapshot);
      expect(footballAttributes).toEqual(attributesSnapshot);
    },
  );

  it("applies the positive trait before the challenging trait", () => {
    const result = applyInitialTraits(
      { ...BASE_STATS },
      { ...BASE_FOOTBALL_ATTRIBUTES },
      "disciplined",
      "undisciplined",
    );
    expect(result.footballAttributes.discipline).toBe(47);
  });

  it("clamps modified values at the upper limit", () => {
    const result = applyInitialTraits(
      { ...BASE_STATS, family: 95 },
      { ...BASE_FOOTBALL_ATTRIBUTES },
      "family_oriented",
      "insecure",
    );
    expect(result.stats.family).toBe(100);
  });

  it("clamps modified values at the lower limit", () => {
    const result = applyInitialTraits(
      { ...BASE_STATS, mood: 3 },
      { ...BASE_FOOTBALL_ATTRIBUTES },
      "disciplined",
      "insecure",
    );
    expect(result.stats.mood).toBe(0);
  });
});
