import type { GameState } from "@amateur-app/shared-types";

import { validateGameState } from "../validation/validate-game-state.js";

export function deserializeGameState(serialized: string): GameState {
  let parsed: unknown;

  try {
    parsed = JSON.parse(serialized) as unknown;
  } catch (error: unknown) {
    throw new Error("Invalid serialized game state: malformed JSON", {
      cause: error,
    });
  }

  return validateGameState(parsed);
}
