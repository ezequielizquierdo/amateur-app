import type { Relationship, RelationshipType } from "@amateur-app/shared-types";

import { clampStat } from "../clamp-stat.js";

const FAMILY_TYPES = new Set<RelationshipType>([
  "mother",
  "father",
  "sibling",
  "grandparent",
  "aunt_uncle",
  "partner",
  "child",
]);

export function calculateFamilySupport(
  relationships: readonly Relationship[],
): number {
  const familyRelationships = relationships.filter(
    (relationship) =>
      FAMILY_TYPES.has(relationship.type) &&
      relationship.isActive &&
      relationship.isAlive,
  );

  if (familyRelationships.length === 0) {
    return 0;
  }

  const total = familyRelationships.reduce(
    (sum, relationship) =>
      sum +
      relationship.affection * 0.45 +
      relationship.trust * 0.45 -
      relationship.conflict * 0.3,
    0,
  );

  return clampStat(total / familyRelationships.length);
}
