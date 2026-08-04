import type {
  ChallengingTrait,
  FootballAttributes,
  PlayerStats,
  PositiveTrait,
} from "@amateur-app/shared-types";

import { clampStat } from "../clamp-stat.js";
import {
  CHALLENGING_TRAIT_MODIFIERS,
  type InitialTraitModifier,
  POSITIVE_TRAIT_MODIFIERS,
} from "./trait-modifiers.js";

export type InitialTraitResult = {
  stats: PlayerStats;
  footballAttributes: FootballAttributes;
};

function applyModifier(
  current: InitialTraitResult,
  modifier: InitialTraitModifier,
): InitialTraitResult {
  const stats = { ...current.stats };
  const footballAttributes = { ...current.footballAttributes };

  for (const [field, adjustment] of Object.entries(modifier.stats ?? {})) {
    const key = field as keyof PlayerStats;
    stats[key] = clampStat(stats[key] + adjustment);
  }
  for (const [field, adjustment] of Object.entries(
    modifier.footballAttributes ?? {},
  )) {
    const key = field as keyof FootballAttributes;
    footballAttributes[key] = clampStat(footballAttributes[key] + adjustment);
  }

  return { stats, footballAttributes };
}

export function applyInitialTraits(
  stats: PlayerStats,
  footballAttributes: FootballAttributes,
  positiveTrait: PositiveTrait,
  challengingTrait: ChallengingTrait,
): InitialTraitResult {
  const afterPositive = applyModifier(
    { stats: { ...stats }, footballAttributes: { ...footballAttributes } },
    POSITIVE_TRAIT_MODIFIERS[positiveTrait],
  );

  return applyModifier(
    afterPositive,
    CHALLENGING_TRAIT_MODIFIERS[challengingTrait],
  );
}
