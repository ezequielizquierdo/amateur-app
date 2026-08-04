import type { FootballAttributes } from "@amateur-app/shared-types";

import { clampStat } from "../clamp-stat.js";

export function calculateFootballLevel(attributes: FootballAttributes): number {
  const level =
    attributes.talent * 0.1 +
    attributes.technique * 0.3 +
    attributes.physicalCondition * 0.25 +
    attributes.tacticalUnderstanding * 0.2 +
    attributes.currentForm * 0.15;

  return clampStat(Math.round(level));
}
