import {
  EventConditionSchema,
  type EventCondition,
  type GameState,
  type Relationship,
  type RelationshipSelector,
} from "@amateur-app/shared-types";

import { validateGameState } from "../../validation/validate-game-state.js";
import { selectStateField } from "./state-field-selectors.js";

function assertNever(value: never): never {
  throw new TypeError(`Unsupported event condition: ${JSON.stringify(value)}`);
}

function compareNumber(
  actual: number,
  operator:
    | "equals"
    | "notEquals"
    | "greaterThan"
    | "greaterThanOrEqual"
    | "lessThan"
    | "lessThanOrEqual",
  expected: number,
): boolean {
  switch (operator) {
    case "equals":
      return actual === expected;
    case "notEquals":
      return actual !== expected;
    case "greaterThan":
      return actual > expected;
    case "greaterThanOrEqual":
      return actual >= expected;
    case "lessThan":
      return actual < expected;
    case "lessThanOrEqual":
      return actual <= expected;
  }
}

function evaluateStateCondition(
  condition: Extract<EventCondition, { type: "state" }>,
  state: GameState,
): boolean {
  const selected = selectStateField(condition.field, state);

  switch (condition.operator) {
    case "exists":
      return selected.exists;
    case "notExists":
      return !selected.exists;
    case "equals":
      return selected.exists && selected.value === condition.value;
    case "notEquals":
      return selected.exists && selected.value !== condition.value;
    case "in":
      return (
        selected.exists &&
        condition.value.some((expected) => expected === selected.value)
      );
    case "notIn":
      return (
        selected.exists &&
        !condition.value.some((expected) => expected === selected.value)
      );
    case "greaterThan":
    case "greaterThanOrEqual":
    case "lessThan":
    case "lessThanOrEqual":
      if (!selected.exists || typeof selected.value !== "number") return false;
      return compareNumber(selected.value, condition.operator, condition.value);
  }
}

function evaluateFlagCondition(
  condition: Extract<EventCondition, { type: "flag" }>,
  state: GameState,
): boolean {
  const exists = Object.hasOwn(state.history.flags, condition.key);

  switch (condition.operator) {
    case "exists":
      return exists;
    case "notExists":
      return !exists;
    case "equals":
      return exists && state.history.flags[condition.key] === condition.value;
    case "notEquals":
      return exists && state.history.flags[condition.key] !== condition.value;
  }
}

function evaluateCounterCondition(
  condition: Extract<EventCondition, { type: "counter" }>,
  state: GameState,
): boolean {
  const exists = Object.hasOwn(state.history.counters, condition.key);
  const storedValue = state.history.counters[condition.key];
  const actual = exists && storedValue !== undefined ? storedValue : 0;

  return compareNumber(actual, condition.operator, condition.value);
}

function matchesRelationshipSelector(
  relationship: Relationship,
  selector: RelationshipSelector,
): boolean {
  if (
    selector.relationshipId !== undefined &&
    relationship.id !== selector.relationshipId
  ) {
    return false;
  }
  if (selector.type !== undefined && relationship.type !== selector.type) {
    return false;
  }
  if (
    selector.requiredTags !== undefined &&
    !selector.requiredTags.every((tag) => relationship.tags.includes(tag))
  ) {
    return false;
  }
  return true;
}

function evaluateRelationshipCondition(
  condition: Extract<EventCondition, { type: "relationship" }>,
  state: GameState,
): boolean {
  const matches = state.relationships.filter((relationship) =>
    matchesRelationshipSelector(relationship, condition.selector),
  );

  if (condition.mode === "exists") {
    return condition.operator === "exists"
      ? matches.length > 0
      : matches.length === 0;
  }

  return matches.some((relationship) => {
    const actual = relationship[condition.field];
    if (condition.field === "isActive" || condition.field === "isAlive") {
      if (typeof actual !== "boolean") return false;
      return condition.operator === "equals"
        ? actual === condition.value
        : actual !== condition.value;
    }
    if (typeof actual !== "number" || typeof condition.value !== "number") {
      return false;
    }
    return compareNumber(actual, condition.operator, condition.value);
  });
}

function evaluateEventHistoryCondition(
  condition: Extract<EventCondition, { type: "event_history" }>,
  state: GameState,
): boolean {
  const count = state.history.decisions.reduce(
    (total, decision) =>
      decision.eventId === condition.eventId ? total + 1 : total,
    0,
  );

  switch (condition.operator) {
    case "completed":
      return count >= 1;
    case "notCompleted":
      return count === 0;
    case "completedAtLeast":
      return count >= condition.count;
  }
}

export function evaluateValidatedEventCondition(
  condition: EventCondition,
  state: GameState,
): boolean {
  switch (condition.type) {
    case "state":
      return evaluateStateCondition(condition, state);
    case "flag":
      return evaluateFlagCondition(condition, state);
    case "counter":
      return evaluateCounterCondition(condition, state);
    case "relationship":
      return evaluateRelationshipCondition(condition, state);
    case "event_history":
      return evaluateEventHistoryCondition(condition, state);
    default:
      return assertNever(condition);
  }
}

export function evaluateEventCondition(
  condition: EventCondition,
  state: GameState,
): boolean {
  const validatedCondition = EventConditionSchema.parse(condition);
  const validatedState = validateGameState(state);
  return evaluateValidatedEventCondition(validatedCondition, validatedState);
}
