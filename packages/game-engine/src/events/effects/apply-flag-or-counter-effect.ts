import type {
  AppliedEffect,
  AppliedEffectSource,
  CounterEffect,
  FlagEffect,
  GameState,
} from "@amateur-app/shared-types";

import { applyNumericOperation } from "./apply-numeric-operation.js";
import { InternalEffectApplicationError } from "./internal-effect-application-error.js";

type FlagOrCounterGameEffect = FlagEffect | CounterEffect;

type FlagOrCounterAppliedEffect = Extract<
  AppliedEffect,
  { type: "flag" | "counter" }
>;

type EffectAuditMetadata = Readonly<{
  source: AppliedEffectSource;
  sourceEffectIndex: number;
}>;

type ScalarValue = boolean | number | string;
type ScalarSnapshot = { exists: false } | { exists: true; value: ScalarValue };
type NumberSnapshot = { exists: false } | { exists: true; value: number };

function assertNever(value: never, family: string): never {
  throw new InternalEffectApplicationError(
    "INVALID_INPUT",
    `Unsupported ${family} effect variant: ${JSON.stringify(value)}`,
  );
}

function copySource(source: AppliedEffectSource): AppliedEffectSource {
  return source.phase === "choice"
    ? { phase: "choice" }
    : { phase: "outcome", outcomeId: source.outcomeId };
}

function present(value: ScalarValue): ScalarSnapshot {
  return { exists: true, value };
}

function sameSnapshot(
  previous: ScalarSnapshot,
  resulting: ScalarSnapshot,
): boolean {
  return (
    previous.exists === resulting.exists &&
    (!previous.exists ||
      (resulting.exists && previous.value === resulting.value))
  );
}

function applyFlagEffect(
  effect: FlagEffect,
  workingState: GameState,
  audit: EffectAuditMetadata,
): Extract<AppliedEffect, { type: "flag" }> {
  const exists = Object.hasOwn(workingState.history.flags, effect.key);
  const storedValue = workingState.history.flags[effect.key];
  const previous: ScalarSnapshot = exists
    ? presentFlagValue(effect.key, storedValue)
    : { exists: false };

  if (previous.exists && typeof previous.value !== typeof effect.value) {
    throw new InternalEffectApplicationError(
      "INVALID_INPUT",
      `flag.${effect.key} failed: cannot change value type from ${typeof previous.value} to ${typeof effect.value}`,
    );
  }

  const resulting = present(effect.value);
  const status = sameSnapshot(previous, resulting) ? "no_change" : "applied";

  if (status === "applied") {
    workingState.history.flags[effect.key] = effect.value;
  }

  return {
    type: effect.type,
    source: copySource(audit.source),
    sourceEffectIndex: audit.sourceEffectIndex,
    status,
    requested: { key: effect.key, value: effect.value },
    previous,
    resulting,
  };
}

function presentFlagValue(
  key: string,
  value: ScalarValue | undefined,
): ScalarSnapshot {
  if (value === undefined) {
    throw new InternalEffectApplicationError(
      "INVALID_INPUT",
      `flag.${key} failed: existing flag has an undefined value`,
    );
  }
  return present(value);
}

function validCounterResult(key: string, value: number): number {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
    throw new InternalEffectApplicationError(
      "INVALID_NUMERIC_RESULT",
      `counter.${key} failed: result must be a finite nonnegative integer`,
    );
  }
  return Object.is(value, -0) ? 0 : value;
}

function presentCounterValue(
  key: string,
  value: number | undefined,
): NumberSnapshot {
  if (value === undefined) {
    throw new InternalEffectApplicationError(
      "INVALID_INPUT",
      `counter.${key} failed: existing counter has an undefined value`,
    );
  }
  return { exists: true, value };
}

function incrementCounter(
  key: string,
  current: number,
  increment: number,
): number {
  let calculated: number;
  try {
    calculated = applyNumericOperation(
      current,
      "add",
      increment,
      "nonnegative",
    );
  } catch (error) {
    if (error instanceof InternalEffectApplicationError) {
      throw new InternalEffectApplicationError(
        error.code,
        `counter.${key} failed during increment: ${error.message}`,
        { cause: error },
      );
    }
    throw error;
  }
  return validCounterResult(key, calculated);
}

function applyCounterEffect(
  effect: CounterEffect,
  workingState: GameState,
  audit: EffectAuditMetadata,
): Extract<AppliedEffect, { type: "counter" }> {
  const exists = Object.hasOwn(workingState.history.counters, effect.key);
  const storedValue = workingState.history.counters[effect.key];
  const previous: NumberSnapshot = exists
    ? presentCounterValue(effect.key, storedValue)
    : { exists: false };
  let resulting: NumberSnapshot;

  switch (effect.operation) {
    case "set": {
      const value = validCounterResult(effect.key, effect.value);
      resulting = { exists: true, value };
      break;
    }
    case "increment": {
      const current = previous.exists ? previous.value : 0;
      const value = incrementCounter(effect.key, current, effect.value);
      resulting =
        exists || value > 0 ? { exists: true, value } : { exists: false };
      break;
    }
    default:
      return assertNever(effect, "counter");
  }

  const status = sameSnapshot(previous, resulting) ? "no_change" : "applied";
  if (status === "applied" && resulting.exists) {
    workingState.history.counters[effect.key] = resulting.value;
  }

  return {
    type: effect.type,
    source: copySource(audit.source),
    sourceEffectIndex: audit.sourceEffectIndex,
    status,
    requested: {
      key: effect.key,
      operation: effect.operation,
      value: effect.value,
    },
    previous,
    resulting,
  };
}

export function applyFlagOrCounterEffect(
  effect: FlagOrCounterGameEffect,
  workingState: GameState,
  audit: EffectAuditMetadata,
): FlagOrCounterAppliedEffect {
  switch (effect.type) {
    case "flag":
      return applyFlagEffect(effect, workingState, audit);
    case "counter":
      return applyCounterEffect(effect, workingState, audit);
    default:
      return assertNever(effect, "flag or counter");
  }
}
