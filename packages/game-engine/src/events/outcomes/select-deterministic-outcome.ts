import {
  assertNoExplicitUndefined,
  ChoiceIdSchema,
  EventIdSchema,
  OutcomeIdSchema,
  ProbabilisticOutcomeSchema,
  type ChoiceId,
  type EventId,
  type GameState,
  type OutcomeId,
  type ProbabilisticOutcome,
} from "@amateur-app/shared-types";

import { validateGameState } from "../../validation/validate-game-state.js";
import { evaluateEventConditionGroup } from "../conditions/evaluate-event-condition-group.js";
import { OutcomeSelectionError } from "./outcome-selection-error.js";

export type OutcomeSelectionContext = Readonly<{
  sourceEventId: EventId;
  sourceEventVersion: number;
  choiceId: ChoiceId;
}>;

const OUTCOME_SELECTION_DOMAIN = "amateur-app:outcome-selection:v1";
const FNV_1A_64_OFFSET_BASIS = 0xcbf29ce484222325n;
const FNV_1A_64_PRIME = 0x100000001b3n;
const UINT64_RANGE = 1n << 64n;
const UINT64_MASK = UINT64_RANGE - 1n;
const contextKeys = [
  "sourceEventId",
  "sourceEventVersion",
  "choiceId",
] as const;

function invalidInput(
  message: string,
  cause: unknown,
  options?: Readonly<{ outcomeIndex?: number; outcomeId?: OutcomeId }>,
): OutcomeSelectionError {
  return new OutcomeSelectionError("INVALID_INPUT", message, {
    cause,
    ...(options?.outcomeIndex === undefined
      ? {}
      : { outcomeIndex: options.outcomeIndex }),
    ...(options?.outcomeId === undefined
      ? {}
      : { outcomeId: options.outcomeId }),
  });
}

function readDataProperty(value: object, key: PropertyKey): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  return descriptor !== undefined && Object.hasOwn(descriptor, "value")
    ? descriptor.value
    : undefined;
}

function availableOutcomeId(value: unknown): OutcomeId | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }
  const result = OutcomeIdSchema.safeParse(readDataProperty(value, "id"));
  return result.success ? result.data : undefined;
}

function validateOutcomes(value: unknown): ProbabilisticOutcome[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw invalidInput("Invalid outcomes: expected a non-empty array", value);
  }

  try {
    assertNoExplicitUndefined(value);
  } catch (cause) {
    throw invalidInput("Invalid outcomes: value is not persistible", cause);
  }

  const validated: ProbabilisticOutcome[] = [];
  for (const [outcomeIndex, outcome] of value.entries()) {
    let result: ReturnType<typeof ProbabilisticOutcomeSchema.safeParse>;
    try {
      result = ProbabilisticOutcomeSchema.safeParse(outcome);
    } catch (cause) {
      const outcomeId = availableOutcomeId(outcome);
      throw invalidInput(`Invalid outcome at index ${outcomeIndex}`, cause, {
        outcomeIndex,
        ...(outcomeId === undefined ? {} : { outcomeId }),
      });
    }
    if (!result.success) {
      const outcomeId = availableOutcomeId(outcome);
      throw invalidInput(
        `Invalid outcome at index ${outcomeIndex}`,
        result.error,
        {
          outcomeIndex,
          ...(outcomeId === undefined ? {} : { outcomeId }),
        },
      );
    }
    validated.push(result.data);
  }
  return validated;
}

function validateContext(value: unknown): OutcomeSelectionContext {
  try {
    assertNoExplicitUndefined(value);
  } catch (cause) {
    throw invalidInput("Invalid outcome selection context", cause);
  }

  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw invalidInput(
      "Invalid outcome selection context: expected an object",
      value,
    );
  }
  const prototype = Reflect.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw invalidInput(
      "Invalid outcome selection context: expected a plain object",
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
    throw invalidInput(
      "Invalid outcome selection context: unexpected or missing properties",
      value,
    );
  }

  const sourceEventId = EventIdSchema.safeParse(
    readDataProperty(value, "sourceEventId"),
  );
  const choiceId = ChoiceIdSchema.safeParse(
    readDataProperty(value, "choiceId"),
  );
  const sourceEventVersion = readDataProperty(value, "sourceEventVersion");
  if (!sourceEventId.success) {
    throw invalidInput(
      "Invalid outcome selection context: sourceEventId",
      sourceEventId.error,
    );
  }
  if (
    typeof sourceEventVersion !== "number" ||
    !Number.isSafeInteger(sourceEventVersion) ||
    sourceEventVersion <= 0
  ) {
    throw invalidInput(
      "Invalid outcome selection context: sourceEventVersion must be a positive safe integer",
      sourceEventVersion,
    );
  }
  if (!choiceId.success) {
    throw invalidInput(
      "Invalid outcome selection context: choiceId",
      choiceId.error,
    );
  }
  return {
    sourceEventId: sourceEventId.data,
    sourceEventVersion,
    choiceId: choiceId.data,
  };
}

function assertUniqueOutcomeIds(
  outcomes: readonly ProbabilisticOutcome[],
): void {
  const seen = new Set<OutcomeId>();
  for (const [outcomeIndex, outcome] of outcomes.entries()) {
    if (seen.has(outcome.id)) {
      throw invalidInput(
        `Duplicate outcome id "${outcome.id}" at index ${outcomeIndex}`,
        outcome.id,
        { outcomeIndex, outcomeId: outcome.id },
      );
    }
    seen.add(outcome.id);
  }
}

function encodeLengthPrefixedComponent(
  component: string,
  encoder: TextEncoder,
): Uint8Array[] {
  const encoded = encoder.encode(component);
  return [encoder.encode(`${encoded.byteLength}:`), encoded];
}

function hashSeedComponents(components: readonly string[]): bigint {
  const encoder = new TextEncoder();
  let hash = FNV_1A_64_OFFSET_BASIS;
  for (const component of components) {
    for (const bytes of encodeLengthPrefixedComponent(component, encoder)) {
      for (const byte of bytes) {
        hash ^= BigInt(byte);
        hash = (hash * FNV_1A_64_PRIME) & UINT64_MASK;
      }
    }
  }
  return hash;
}

function selectByWeight(
  outcomes: readonly ProbabilisticOutcome[],
  state: GameState,
  context: OutcomeSelectionContext,
): ProbabilisticOutcome {
  const hash = hashSeedComponents([
    OUTCOME_SELECTION_DOMAIN,
    state.seed,
    state.runId,
    String(state.currentTurn),
    context.sourceEventId,
    String(context.sourceEventVersion),
    context.choiceId,
  ]);
  const totalWeight = outcomes.reduce(
    (total, outcome) => total + BigInt(outcome.weight),
    0n,
  );
  let cumulativeWeight = 0n;
  for (const outcome of outcomes) {
    cumulativeWeight += BigInt(outcome.weight);
    if (hash * totalWeight < cumulativeWeight * UINT64_RANGE) {
      return outcome;
    }
  }
  throw new OutcomeSelectionError(
    "INVALID_INPUT",
    "Valid outcome weights did not cover the deterministic selection range",
  );
}

export function selectDeterministicOutcome(
  outcomes: readonly ProbabilisticOutcome[],
  state: GameState,
  context: OutcomeSelectionContext,
): ProbabilisticOutcome {
  let validatedState: GameState;
  try {
    validatedState = validateGameState(state);
  } catch (cause) {
    throw invalidInput("Invalid game state", cause);
  }
  const validatedOutcomes = validateOutcomes(outcomes);
  const validatedContext = validateContext(context);
  assertUniqueOutcomeIds(validatedOutcomes);

  const eligibleOutcomes: ProbabilisticOutcome[] = [];
  for (const [outcomeIndex, outcome] of validatedOutcomes.entries()) {
    if (outcome.availability === undefined) {
      eligibleOutcomes.push(outcome);
      continue;
    }
    try {
      if (evaluateEventConditionGroup(outcome.availability, validatedState)) {
        eligibleOutcomes.push(outcome);
      }
    } catch (cause) {
      throw invalidInput(
        `Invalid availability for outcome at index ${outcomeIndex}`,
        cause,
        { outcomeIndex, outcomeId: outcome.id },
      );
    }
  }

  if (eligibleOutcomes.length === 0) {
    throw new OutcomeSelectionError(
      "NO_ELIGIBLE_OUTCOME",
      "No eligible outcome is available for the current game state",
    );
  }
  if (eligibleOutcomes.length === 1) {
    return eligibleOutcomes[0]!;
  }
  return selectByWeight(eligibleOutcomes, validatedState, validatedContext);
}
