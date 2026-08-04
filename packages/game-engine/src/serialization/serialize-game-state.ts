import type { GameState } from "@amateur-app/shared-types";

import { validateGameState } from "../validation/validate-game-state.js";

export function serializeGameState(state: GameState): string {
  return JSON.stringify(validateGameState(state));
}
