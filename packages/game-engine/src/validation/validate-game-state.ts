import { GameStateSchema, type GameState } from "@amateur-app/shared-types";

import { calculateFootballLevel } from "../calculations/calculate-football-level.js";
import { assertNoExplicitUndefined } from "./assert-no-explicit-undefined.js";

export function validateGameState(value: unknown): GameState {
  assertNoExplicitUndefined(value);
  const result = GameStateSchema.safeParse(value);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".") || "state"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid game state: ${details}`, { cause: result.error });
  }

  const expectedFootballLevel = calculateFootballLevel(
    result.data.footballAttributes,
  );
  if (result.data.stats.footballLevel !== expectedFootballLevel) {
    throw new Error(
      `Invalid game state: stats.footballLevel must be ${expectedFootballLevel} for the supplied footballAttributes`,
    );
  }

  return result.data;
}
