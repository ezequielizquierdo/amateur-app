import type { PlayerStats } from "@amateur-app/shared-types";

import { clampStat } from "../clamp-stat.js";

export function calculateBurnout(
  stats: Pick<PlayerStats, "mood" | "energy" | "health">,
): number {
  return clampStat(
    (100 - stats.mood) * 0.4 +
      (100 - stats.energy) * 0.4 +
      (100 - stats.health) * 0.2,
  );
}
