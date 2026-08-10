import {
  RelationshipSchema,
  type AppliedEffect,
  type AppliedEffectSource,
  type CreateRelationshipEffect,
  type DeactivateRelationshipEffect,
  type GameState,
  type Relationship,
  type RelationshipSelector,
  type RelationshipValueEffect,
} from "@amateur-app/shared-types";

import { applyNumericOperation } from "./apply-numeric-operation.js";
import { InternalEffectApplicationError } from "./internal-effect-application-error.js";

type RelationshipGameEffect =
  | RelationshipValueEffect
  | CreateRelationshipEffect
  | DeactivateRelationshipEffect;

type RelationshipAppliedEffect = Extract<
  AppliedEffect,
  {
    type:
      "relationship_value" | "create_relationship" | "deactivate_relationship";
  }
>;

type EffectAuditMetadata = Readonly<{
  source: AppliedEffectSource;
  sourceEffectIndex: number;
}>;

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

function cloneRelationship(relationship: Relationship): Relationship {
  return structuredClone(relationship);
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

function calculateRelationshipValue(
  effect: RelationshipValueEffect,
  previous: number,
): number {
  try {
    return applyNumericOperation(
      previous,
      effect.operation,
      effect.value,
      "scale",
    );
  } catch (error) {
    if (error instanceof InternalEffectApplicationError) {
      throw new InternalEffectApplicationError(
        error.code,
        `${effect.type}.${effect.field} failed: ${error.message}`,
        { cause: error },
      );
    }
    throw error;
  }
}

function applyRelationshipValueEffect(
  effect: RelationshipValueEffect,
  workingState: GameState,
  audit: EffectAuditMetadata,
): readonly Extract<AppliedEffect, { type: "relationship_value" }>[] {
  const prepared: Array<{
    target: Relationship;
    resultingValue: number;
    record: Extract<AppliedEffect, { type: "relationship_value" }>;
  }> = [];

  for (const relationship of workingState.relationships) {
    if (!matchesRelationshipSelector(relationship, effect.selector)) continue;

    const previousValue = relationship[effect.field];
    const resultingValue = calculateRelationshipValue(effect, previousValue);
    const status = resultingValue === previousValue ? "no_change" : "applied";

    prepared.push({
      target: relationship,
      resultingValue,
      record: {
        type: effect.type,
        source: copySource(audit.source),
        sourceEffectIndex: audit.sourceEffectIndex,
        status,
        requested: {
          selector: structuredClone(effect.selector),
          field: effect.field,
          operation: effect.operation,
          value: effect.value,
        },
        relationshipId: relationship.id,
        previous: { exists: true, value: previousValue },
        resulting: { exists: true, value: resultingValue },
      },
    });
  }

  if (prepared.length === 0) {
    throw new InternalEffectApplicationError(
      "RELATIONSHIP_SELECTOR_NO_MATCH",
      "relationship_value failed: selector did not match any relationship",
    );
  }

  for (const item of prepared) {
    if (item.record.status === "applied") {
      item.target[effect.field] = item.resultingValue;
    }
  }

  return prepared.map((item) => item.record);
}

function createRequested(effect: CreateRelationshipEffect) {
  return {
    relationship: structuredClone(effect.relationship),
    conflictPolicy: effect.conflictPolicy,
  };
}

function applyCreateRelationshipEffect(
  effect: CreateRelationshipEffect,
  workingState: GameState,
  audit: EffectAuditMetadata,
): readonly Extract<AppliedEffect, { type: "create_relationship" }>[] {
  const existing = workingState.relationships.find(
    (relationship) => relationship.id === effect.relationship.id,
  );

  if (existing !== undefined) {
    if (effect.conflictPolicy === "error") {
      throw new InternalEffectApplicationError(
        "RELATIONSHIP_ID_CONFLICT",
        `create_relationship failed: relationship ID ${effect.relationship.id} already exists`,
      );
    }

    return [
      {
        type: effect.type,
        source: copySource(audit.source),
        sourceEffectIndex: audit.sourceEffectIndex,
        status: "ignored",
        requested: {
          relationship: structuredClone(effect.relationship),
          conflictPolicy: "ignore",
        },
        previous: { exists: true, value: cloneRelationship(existing) },
        resulting: { exists: true, value: cloneRelationship(existing) },
      },
    ];
  }

  const candidate = {
    ...structuredClone(effect.relationship),
    startedAtAge: workingState.life.age,
    isActive: true as const,
    isAlive: true as const,
  };
  let completedRelationship: Relationship;
  try {
    completedRelationship = RelationshipSchema.parse(candidate);
  } catch (cause) {
    throw new InternalEffectApplicationError(
      "INVALID_INPUT",
      `create_relationship failed: completed relationship ${effect.relationship.id} is invalid`,
      { cause },
    );
  }

  const relationshipForState = cloneRelationship(completedRelationship);
  const record: Extract<AppliedEffect, { type: "create_relationship" }> = {
    type: effect.type,
    source: copySource(audit.source),
    sourceEffectIndex: audit.sourceEffectIndex,
    status: "applied",
    requested: createRequested(effect),
    previous: { exists: false },
    resulting: {
      exists: true,
      value: cloneRelationship(completedRelationship),
    },
  };

  workingState.relationships.push(relationshipForState);
  return [record];
}

function applyDeactivateRelationshipEffect(
  effect: DeactivateRelationshipEffect,
  workingState: GameState,
  audit: EffectAuditMetadata,
): readonly Extract<AppliedEffect, { type: "deactivate_relationship" }>[] {
  const relationship = workingState.relationships.find(
    (candidate) => candidate.id === effect.relationshipId,
  );
  if (relationship === undefined) {
    throw new InternalEffectApplicationError(
      "RELATIONSHIP_NOT_FOUND",
      `deactivate_relationship failed: relationship ID ${effect.relationshipId} was not found`,
    );
  }

  const previous = cloneRelationship(relationship);
  const resulting = {
    ...cloneRelationship(relationship),
    isActive: false as const,
  };
  const status = relationship.isActive ? "applied" : "no_change";
  const record: Extract<AppliedEffect, { type: "deactivate_relationship" }> = {
    type: effect.type,
    source: copySource(audit.source),
    sourceEffectIndex: audit.sourceEffectIndex,
    status,
    requested: { relationshipId: effect.relationshipId },
    previous: { exists: true, value: previous },
    resulting: { exists: true, value: resulting },
  };

  if (status === "applied") relationship.isActive = false;
  return [record];
}

export function applyRelationshipEffect(
  effect: RelationshipGameEffect,
  workingState: GameState,
  audit: EffectAuditMetadata,
): readonly RelationshipAppliedEffect[] {
  switch (effect.type) {
    case "relationship_value":
      return applyRelationshipValueEffect(effect, workingState, audit);
    case "create_relationship":
      return applyCreateRelationshipEffect(effect, workingState, audit);
    case "deactivate_relationship":
      return applyDeactivateRelationshipEffect(effect, workingState, audit);
    default:
      return assertNever(effect, "relationship");
  }
}
