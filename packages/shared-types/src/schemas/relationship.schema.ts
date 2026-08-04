import { z } from "zod";

import {
  NonEmptyStringSchema,
  NonNegativeIntegerSchema,
  ScaleSchema,
} from "./common.schema.js";

export const RelationshipTypeSchema = z.enum([
  "mother",
  "father",
  "sibling",
  "grandparent",
  "aunt_uncle",
  "partner",
  "child",
  "friend",
  "teammate",
  "coach",
  "agent",
]);

export const RelationshipSchema = z
  .object({
    id: NonEmptyStringSchema,
    characterId: NonEmptyStringSchema,
    type: RelationshipTypeSchema,
    displayName: NonEmptyStringSchema,
    affection: ScaleSchema,
    trust: ScaleSchema,
    conflict: ScaleSchema,
    isActive: z.boolean(),
    isAlive: z.boolean(),
    startedAtAge: NonNegativeIntegerSchema,
    tags: z.array(NonEmptyStringSchema),
  })
  .strict();
