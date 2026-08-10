import type {
  AppliedEffect,
  AppliedEffectSource,
  FootballAttributeEffect,
  FootballStateEffect,
  GameState,
  LifeStateEffect,
  PlayerStatEffect,
} from "@amateur-app/shared-types";

import { applyNumericOperation } from "./apply-numeric-operation.js";
import { InternalEffectApplicationError } from "./internal-effect-application-error.js";

type ScalarOrStateGameEffect =
  | PlayerStatEffect
  | FootballAttributeEffect
  | LifeStateEffect
  | FootballStateEffect;

type ScalarOrStateAppliedEffect = Extract<
  AppliedEffect,
  {
    type:
      "player_stat" | "football_attribute" | "life_state" | "football_state";
  }
>;

type EffectAuditMetadata = Readonly<{
  source: AppliedEffectSource;
  sourceEffectIndex: number;
}>;

type ScalarValue = boolean | number | string;
type ScalarSnapshot = { exists: false } | { exists: true; value: ScalarValue };
type RequestedWithoutType<T> = T extends { type: string }
  ? Omit<T, "type">
  : never;

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

function requestedWithoutType<T extends ScalarOrStateGameEffect>(
  effect: T,
): RequestedWithoutType<T> {
  const { type, ...requested } = effect;
  void type;
  return requested as RequestedWithoutType<T>;
}

function present(value: ScalarValue): ScalarSnapshot {
  return { exists: true, value };
}

function calculateNumericResult(
  family: ScalarOrStateGameEffect["type"],
  field: string,
  previous: number,
  operation: "set" | "add" | "multiply",
  requested: number,
  limit: "scale" | "nonnegative" | "none",
): number {
  try {
    return applyNumericOperation(previous, operation, requested, limit);
  } catch (error) {
    if (error instanceof InternalEffectApplicationError) {
      throw new InternalEffectApplicationError(
        error.code,
        `${family}.${field} failed: ${error.message}`,
        { cause: error },
      );
    }
    throw error;
  }
}

function applyPlayerStatEffect(
  effect: PlayerStatEffect,
  workingState: GameState,
  audit: EffectAuditMetadata,
): Extract<AppliedEffect, { type: "player_stat" }> {
  const previousValue = workingState.stats[effect.field];
  const resultingValue = calculateNumericResult(
    effect.type,
    effect.field,
    previousValue,
    effect.operation,
    effect.value,
    "scale",
  );
  const status = resultingValue === previousValue ? "no_change" : "applied";

  if (status === "applied") {
    workingState.stats[effect.field] = resultingValue;
  }

  return {
    type: effect.type,
    source: copySource(audit.source),
    sourceEffectIndex: audit.sourceEffectIndex,
    status,
    requested: requestedWithoutType(effect),
    previous: present(previousValue),
    resulting: present(resultingValue),
  };
}

function applyFootballAttributeEffect(
  effect: FootballAttributeEffect,
  workingState: GameState,
  audit: EffectAuditMetadata,
): Extract<AppliedEffect, { type: "football_attribute" }> {
  const previousValue = workingState.footballAttributes[effect.field];
  const resultingValue = calculateNumericResult(
    effect.type,
    effect.field,
    previousValue,
    effect.operation,
    effect.value,
    "scale",
  );
  const status = resultingValue === previousValue ? "no_change" : "applied";

  if (status === "applied") {
    workingState.footballAttributes[effect.field] = resultingValue;
  }

  return {
    type: effect.type,
    source: copySource(audit.source),
    sourceEffectIndex: audit.sourceEffectIndex,
    status,
    requested: requestedWithoutType(effect),
    previous: present(previousValue),
    resulting: present(resultingValue),
  };
}

function lifeValue(
  state: GameState,
  field: LifeStateEffect["field"],
): ScalarSnapshot {
  if (field === "occupationId" || field === "employerId") {
    return Object.hasOwn(state.life, field)
      ? present(state.life[field] as string)
      : { exists: false };
  }
  return present(state.life[field]);
}

function setLifeValue(
  state: GameState,
  effect: Extract<LifeStateEffect, { operation: "set" }>,
): void {
  switch (effect.field) {
    case "educationStatus":
      state.life.educationStatus = effect.value;
      return;
    case "employmentStatus":
      state.life.employmentStatus = effect.value;
      return;
    case "relationshipStatus":
      state.life.relationshipStatus = effect.value;
      return;
    case "occupationId":
      state.life.occupationId = effect.value;
      return;
    case "employerId":
      state.life.employerId = effect.value;
      return;
    case "city":
      state.life.city = effect.value;
      return;
    case "country":
      state.life.country = effect.value;
      return;
    case "numberOfChildren":
      state.life.numberOfChildren = effect.value;
      return;
    case "housingStatus":
      state.life.housingStatus = effect.value;
      return;
    default:
      return assertNever(effect, "life_state set");
  }
}

function applyLifeStateEffect(
  effect: LifeStateEffect,
  workingState: GameState,
  audit: EffectAuditMetadata,
): Extract<AppliedEffect, { type: "life_state" }> {
  const previous = lifeValue(workingState, effect.field);
  let resulting: ScalarSnapshot;

  switch (effect.operation) {
    case "set": {
      const changed = !previous.exists || previous.value !== effect.value;
      if (changed) setLifeValue(workingState, effect);
      resulting = present(effect.value);
      break;
    }
    case "add": {
      const previousValue = workingState.life.numberOfChildren;
      const resultingValue = calculateNumericResult(
        effect.type,
        effect.field,
        previousValue,
        effect.operation,
        effect.value,
        "none",
      );
      if (!Number.isInteger(resultingValue) || resultingValue < 0) {
        throw new InternalEffectApplicationError(
          "INVALID_NUMERIC_RESULT",
          `${effect.type}.${effect.field} failed: result must be a nonnegative integer`,
        );
      }
      if (resultingValue !== previousValue) {
        workingState.life.numberOfChildren = resultingValue;
      }
      resulting = present(resultingValue);
      break;
    }
    case "clear": {
      if (previous.exists) delete workingState.life[effect.field];
      resulting = { exists: false };
      break;
    }
    default:
      return assertNever(effect, "life_state");
  }

  const status =
    previous.exists === resulting.exists &&
    (!previous.exists ||
      (resulting.exists && previous.value === resulting.value))
      ? "no_change"
      : "applied";

  return {
    type: effect.type,
    source: copySource(audit.source),
    sourceEffectIndex: audit.sourceEffectIndex,
    status,
    requested: requestedWithoutType(effect),
    previous,
    resulting,
  };
}

function footballValue(
  state: GameState,
  field: FootballStateEffect["field"],
): ScalarSnapshot {
  if (
    field === "currentTeamId" ||
    field === "currentClubId" ||
    field === "currentContractId" ||
    field === "currentAgentId" ||
    field === "currentInjuryId"
  ) {
    return Object.hasOwn(state.football, field)
      ? present(state.football[field] as string)
      : { exists: false };
  }
  return present(state.football[field]);
}

function setFootballValue(
  state: GameState,
  effect: Extract<FootballStateEffect, { operation: "set" }>,
): void {
  switch (effect.field) {
    case "status":
      state.football.status = effect.value;
      return;
    case "careerType":
      state.football.careerType = effect.value;
      return;
    case "currentTeamId":
      state.football.currentTeamId = effect.value;
      return;
    case "currentClubId":
      state.football.currentClubId = effect.value;
      return;
    case "currentContractId":
      state.football.currentContractId = effect.value;
      return;
    case "currentAgentId":
      state.football.currentAgentId = effect.value;
      return;
    case "teamRole":
      state.football.teamRole = effect.value;
      return;
    case "teamTrust":
    case "coachTrust":
    case "professionalReputation":
    case "amateurReputation":
    case "salary":
    case "marketValue":
      state.football[effect.field] = effect.value;
      return;
    case "isInjured":
      state.football.isInjured = effect.value;
      return;
    case "currentInjuryId":
      state.football.currentInjuryId = effect.value;
      return;
    case "retirementStatus":
      state.football.retirementStatus = effect.value;
      return;
    default:
      return assertNever(effect, "football_state set");
  }
}

function applyFootballStateEffect(
  effect: FootballStateEffect,
  workingState: GameState,
  audit: EffectAuditMetadata,
): Extract<AppliedEffect, { type: "football_state" }> {
  const previous = footballValue(workingState, effect.field);
  let resulting: ScalarSnapshot;

  switch (effect.operation) {
    case "set": {
      if (
        effect.field === "teamTrust" ||
        effect.field === "coachTrust" ||
        effect.field === "professionalReputation" ||
        effect.field === "amateurReputation"
      ) {
        const value = calculateNumericResult(
          effect.type,
          effect.field,
          previous.exists ? (previous.value as number) : 0,
          effect.operation,
          effect.value,
          "scale",
        );
        if (!previous.exists || previous.value !== value) {
          workingState.football[effect.field] = value;
        }
        resulting = present(value);
      } else if (effect.field === "salary" || effect.field === "marketValue") {
        const value = calculateNumericResult(
          effect.type,
          effect.field,
          previous.exists ? (previous.value as number) : 0,
          effect.operation,
          effect.value,
          "nonnegative",
        );
        if (!previous.exists || previous.value !== value) {
          workingState.football[effect.field] = value;
        }
        resulting = present(value);
      } else {
        const changed = !previous.exists || previous.value !== effect.value;
        if (changed) setFootballValue(workingState, effect);
        resulting = present(effect.value);
      }
      break;
    }
    case "add": {
      const previousValue = previous.exists ? (previous.value as number) : 0;
      const limit =
        effect.field === "salary" || effect.field === "marketValue"
          ? "nonnegative"
          : "scale";
      const resultingValue = calculateNumericResult(
        effect.type,
        effect.field,
        previousValue,
        effect.operation,
        effect.value,
        limit,
      );
      if (resultingValue !== previousValue) {
        workingState.football[effect.field] = resultingValue;
      }
      resulting = present(resultingValue);
      break;
    }
    case "clear": {
      if (previous.exists) delete workingState.football[effect.field];
      resulting = { exists: false };
      break;
    }
    default:
      return assertNever(effect, "football_state");
  }

  const status =
    previous.exists === resulting.exists &&
    (!previous.exists ||
      (resulting.exists && previous.value === resulting.value))
      ? "no_change"
      : "applied";

  return {
    type: effect.type,
    source: copySource(audit.source),
    sourceEffectIndex: audit.sourceEffectIndex,
    status,
    requested: requestedWithoutType(effect),
    previous,
    resulting,
  };
}

export function applyScalarOrStateEffect(
  effect: ScalarOrStateGameEffect,
  workingState: GameState,
  audit: EffectAuditMetadata,
): ScalarOrStateAppliedEffect {
  switch (effect.type) {
    case "player_stat":
      return applyPlayerStatEffect(effect, workingState, audit);
    case "football_attribute":
      return applyFootballAttributeEffect(effect, workingState, audit);
    case "life_state":
      return applyLifeStateEffect(effect, workingState, audit);
    case "football_state":
      return applyFootballStateEffect(effect, workingState, audit);
    default:
      return assertNever(effect, "scalar or state");
  }
}
