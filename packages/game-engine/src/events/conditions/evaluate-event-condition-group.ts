import {
  EventConditionGroupSchema,
  type EventConditionGroup,
  type GameState,
} from "@amateur-app/shared-types";

import { validateGameState } from "../../validation/validate-game-state.js";
import { evaluateValidatedEventCondition } from "./evaluate-event-condition.js";

export function evaluateEventConditionGroup(
  group: EventConditionGroup,
  state: GameState,
): boolean {
  const validatedGroup = EventConditionGroupSchema.parse(group);
  const validatedState = validateGameState(state);
  const results = validatedGroup.conditions.map((condition) =>
    evaluateValidatedEventCondition(condition, validatedState),
  );
  const combined =
    validatedGroup.mode === "all"
      ? results.every((result) => result)
      : results.some((result) => result);

  return validatedGroup.negate === true ? !combined : combined;
}
