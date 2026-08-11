import {
  AppliedEffectSourceSchema,
  assertNoExplicitUndefined,
  ChoiceIdSchema,
  EventIdSchema,
  GameEffectSchema,
  type AppliedEffect,
  type AppliedEffectSource,
  type ChoiceId,
  type EventId,
  type GameEffect,
  type GameState,
} from "@amateur-app/shared-types";

import { calculateFootballLevel } from "../calculations/calculate-football-level.js";
import { validateGameState } from "../validation/validate-game-state.js";
import { EventEffectResolutionError } from "./event-effect-resolution-error.js";
import { applyFlagOrCounterEffect } from "./effects/apply-flag-or-counter-effect.js";
import { applyRelationshipEffect } from "./effects/apply-relationship-effect.js";
import { applyScalarOrStateEffect } from "./effects/apply-scalar-or-state-effect.js";
import { applyScheduleEventEffect } from "./effects/apply-schedule-event-effect.js";
import { InternalEffectApplicationError } from "./effects/internal-effect-application-error.js";

export type EffectResolutionContext = Readonly<{
  sourceEventId: EventId;
  sourceEventVersion: number;
  choiceId: ChoiceId;
  source: AppliedEffectSource;
}>;

const contextKeys = [
  "sourceEventId",
  "sourceEventVersion",
  "choiceId",
  "source",
] as const;

function inputError(
  message: string,
  cause: unknown,
): EventEffectResolutionError {
  return new EventEffectResolutionError("INVALID_INPUT", message, { cause });
}

function readProperty(value: object, key: PropertyKey): unknown {
  return (value as Record<PropertyKey, unknown>)[key];
}

function recognizedEffectType(value: unknown): GameEffect["type"] | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }
  const type = readProperty(value, "type");
  switch (type) {
    case "player_stat":
    case "football_attribute":
    case "life_state":
    case "football_state":
    case "flag":
    case "counter":
    case "relationship_value":
    case "create_relationship":
    case "deactivate_relationship":
    case "schedule_event":
      return type;
    default:
      return undefined;
  }
}

function validateEffects(value: unknown): GameEffect[] {
  if (!Array.isArray(value)) {
    throw inputError("Invalid effects: expected an array", value);
  }

  try {
    assertNoExplicitUndefined(value);
  } catch (cause) {
    throw inputError("Invalid effects: value is not persistible", cause);
  }

  const validatedEffects: GameEffect[] = [];
  for (const [effectIndex, effect] of value.entries()) {
    const result = GameEffectSchema.safeParse(effect);
    if (!result.success) {
      const effectType = recognizedEffectType(effect);
      throw new EventEffectResolutionError(
        "INVALID_INPUT",
        `Invalid effect at index ${effectIndex}`,
        {
          effectIndex,
          ...(effectType === undefined ? {} : { effectType }),
          cause: result.error,
        },
      );
    }
    validatedEffects.push(result.data);
  }
  return validatedEffects;
}

function validateContext(value: unknown): EffectResolutionContext {
  try {
    assertNoExplicitUndefined(value);
  } catch (cause) {
    throw inputError("Invalid effect resolution context", cause);
  }

  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw inputError(
      "Invalid effect resolution context: expected an object",
      value,
    );
  }
  const prototype = Reflect.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw inputError(
      "Invalid effect resolution context: expected a plain object",
      value,
    );
  }

  const ownKeys = Reflect.ownKeys(value);
  if (
    ownKeys.length !== contextKeys.length ||
    !ownKeys.every(
      (key) =>
        typeof key === "string" &&
        contextKeys.some((contextKey) => contextKey === key),
    )
  ) {
    throw inputError(
      "Invalid effect resolution context: unexpected or missing properties",
      value,
    );
  }

  const sourceEventId = EventIdSchema.safeParse(
    readProperty(value, "sourceEventId"),
  );
  const choiceId = ChoiceIdSchema.safeParse(readProperty(value, "choiceId"));
  const source = AppliedEffectSourceSchema.safeParse(
    readProperty(value, "source"),
  );
  const sourceEventVersion = readProperty(value, "sourceEventVersion");

  if (!sourceEventId.success) {
    throw inputError(
      "Invalid effect resolution context: sourceEventId",
      sourceEventId.error,
    );
  }
  if (!choiceId.success) {
    throw inputError(
      "Invalid effect resolution context: choiceId",
      choiceId.error,
    );
  }
  if (!source.success) {
    throw inputError("Invalid effect resolution context: source", source.error);
  }
  if (
    typeof sourceEventVersion !== "number" ||
    !Number.isSafeInteger(sourceEventVersion) ||
    sourceEventVersion <= 0
  ) {
    throw inputError(
      "Invalid effect resolution context: sourceEventVersion must be a positive integer",
      sourceEventVersion,
    );
  }

  return {
    sourceEventId: sourceEventId.data,
    sourceEventVersion,
    choiceId: choiceId.data,
    source:
      source.data.phase === "choice"
        ? { phase: "choice" }
        : { phase: "outcome", outcomeId: source.data.outcomeId },
  };
}

function assertNever(value: never, effectIndex: number): never {
  throw new EventEffectResolutionError(
    "INVALID_INPUT",
    `Unsupported effect variant at index ${effectIndex}: ${JSON.stringify(value)}`,
    { effectIndex },
  );
}

function applyEffect(
  effect: GameEffect,
  effectIndex: number,
  workingState: GameState,
  context: EffectResolutionContext,
  appliedEffects: AppliedEffect[],
): void {
  const audit = {
    source: context.source,
    sourceEffectIndex: effectIndex,
  };

  switch (effect.type) {
    case "player_stat":
    case "football_attribute":
    case "life_state":
    case "football_state":
      appliedEffects.push(
        applyScalarOrStateEffect(effect, workingState, audit),
      );
      return;
    case "flag":
    case "counter":
      appliedEffects.push(
        applyFlagOrCounterEffect(effect, workingState, audit),
      );
      return;
    case "relationship_value":
    case "create_relationship":
    case "deactivate_relationship":
      appliedEffects.push(
        ...applyRelationshipEffect(effect, workingState, audit),
      );
      return;
    case "schedule_event":
      appliedEffects.push(
        applyScheduleEventEffect(effect, workingState, {
          sourceEventId: context.sourceEventId,
          sourceEventVersion: context.sourceEventVersion,
          choiceId: context.choiceId,
          source: context.source,
          sourceEffectIndex: effectIndex,
        }),
      );
      return;
    default:
      return assertNever(effect, effectIndex);
  }
}

export function resolveGameEffects(
  effects: readonly GameEffect[],
  state: GameState,
  context: EffectResolutionContext,
): { nextState: GameState; appliedEffects: AppliedEffect[] } {
  let validatedState: GameState;
  try {
    validatedState = validateGameState(state);
  } catch (cause) {
    throw inputError("Invalid initial game state", cause);
  }

  const validatedEffects = validateEffects(effects);
  const validatedContext = validateContext(context);
  const workingState = structuredClone(validatedState);
  const appliedEffects: AppliedEffect[] = [];

  for (const [effectIndex, effect] of validatedEffects.entries()) {
    try {
      applyEffect(
        effect,
        effectIndex,
        workingState,
        validatedContext,
        appliedEffects,
      );
    } catch (error) {
      if (error instanceof InternalEffectApplicationError) {
        throw new EventEffectResolutionError(error.code, error.message, {
          effectIndex,
          effectType: effect.type,
          cause: error,
        });
      }
      throw error;
    }
  }

  workingState.stats.footballLevel = calculateFootballLevel(
    workingState.footballAttributes,
  );

  let nextState: GameState;
  try {
    nextState = validateGameState(workingState);
  } catch (cause) {
    throw new EventEffectResolutionError(
      "INVALID_RESULT_STATE",
      "Resolved effects produced an invalid game state",
      { cause },
    );
  }

  return { nextState, appliedEffects };
}
