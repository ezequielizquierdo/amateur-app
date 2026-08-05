import { z } from "zod";

import { NonEmptyStringSchema, ScaleSchema } from "../common.schema.js";
import {
  CareerTypeSchema,
  FootballStatusSchema,
  RetirementStatusSchema,
  TeamRoleSchema,
} from "../football.schema.js";
import {
  EducationStatusSchema,
  EmploymentStatusSchema,
  HousingStatusSchema,
  RelationshipStatusSchema,
} from "../life.schema.js";
import { RelationshipTypeSchema } from "../relationship.schema.js";
import { RelationshipSelectorSchema } from "./conditions.schema.js";
import { FollowUpDefinitionSchema } from "./follow-up.schema.js";

export const PlayerStatEffectSchema = z
  .object({
    type: z.literal("player_stat"),
    field: z.enum([
      "mood",
      "energy",
      "health",
      "family",
      "friends",
      "finances",
    ]),
    operation: z.enum(["add", "set", "multiply"]),
    value: z.number().finite(),
  })
  .strict();

export const FootballAttributeEffectSchema = z
  .object({
    type: z.literal("football_attribute"),
    field: z.enum([
      "talent",
      "technique",
      "physicalCondition",
      "tacticalUnderstanding",
      "discipline",
      "currentForm",
      "potential",
      "injuryRisk",
    ]),
    operation: z.enum(["add", "set", "multiply"]),
    value: z.number().finite(),
  })
  .strict();

const lifeSetEffects = [
  ["educationStatus", EducationStatusSchema],
  ["employmentStatus", EmploymentStatusSchema],
  ["relationshipStatus", RelationshipStatusSchema],
  ["occupationId", NonEmptyStringSchema],
  ["employerId", NonEmptyStringSchema],
  ["city", NonEmptyStringSchema],
  ["country", NonEmptyStringSchema],
  ["numberOfChildren", z.number().int().nonnegative()],
  ["housingStatus", HousingStatusSchema],
] as const;

export const LifeStateEffectSchema = z.union([
  ...lifeSetEffects.map(([field, value]) =>
    z
      .object({
        type: z.literal("life_state"),
        field: z.literal(field),
        operation: z.literal("set"),
        value,
      })
      .strict(),
  ),
  z
    .object({
      type: z.literal("life_state"),
      field: z.literal("numberOfChildren"),
      operation: z.literal("add"),
      value: z.number().int(),
    })
    .strict(),
  z
    .object({
      type: z.literal("life_state"),
      field: z.enum(["occupationId", "employerId"]),
      operation: z.literal("clear"),
    })
    .strict(),
]);

const footballSetEffects = [
  ["status", FootballStatusSchema],
  ["careerType", CareerTypeSchema],
  ["currentTeamId", NonEmptyStringSchema],
  ["currentClubId", NonEmptyStringSchema],
  ["currentContractId", NonEmptyStringSchema],
  ["currentAgentId", NonEmptyStringSchema],
  ["teamRole", TeamRoleSchema],
  ["teamTrust", ScaleSchema],
  ["coachTrust", ScaleSchema],
  ["professionalReputation", ScaleSchema],
  ["amateurReputation", ScaleSchema],
  ["salary", z.number().finite().nonnegative()],
  ["marketValue", z.number().finite().nonnegative()],
  ["isInjured", z.boolean()],
  ["currentInjuryId", NonEmptyStringSchema],
  ["retirementStatus", RetirementStatusSchema],
] as const;

export const FootballStateEffectSchema = z.union([
  ...footballSetEffects.map(([field, value]) =>
    z
      .object({
        type: z.literal("football_state"),
        field: z.literal(field),
        operation: z.literal("set"),
        value,
      })
      .strict(),
  ),
  z
    .object({
      type: z.literal("football_state"),
      field: z.enum([
        "teamTrust",
        "coachTrust",
        "professionalReputation",
        "amateurReputation",
        "salary",
        "marketValue",
      ]),
      operation: z.literal("add"),
      value: z.number().finite(),
    })
    .strict(),
  z
    .object({
      type: z.literal("football_state"),
      field: z.enum([
        "currentTeamId",
        "currentClubId",
        "currentContractId",
        "currentAgentId",
        "currentInjuryId",
      ]),
      operation: z.literal("clear"),
    })
    .strict(),
]);

export const FlagEffectSchema = z
  .object({
    type: z.literal("flag"),
    key: NonEmptyStringSchema,
    value: z.union([z.boolean(), z.number().finite(), z.string()]),
  })
  .strict();

export const CounterEffectSchema = z.union([
  z
    .object({
      type: z.literal("counter"),
      key: NonEmptyStringSchema,
      operation: z.literal("set"),
      value: z.number().int().nonnegative(),
    })
    .strict(),
  z
    .object({
      type: z.literal("counter"),
      key: NonEmptyStringSchema,
      operation: z.literal("increment"),
      value: z.number().int(),
    })
    .strict(),
]);

export const RelationshipValueEffectSchema = z
  .object({
    type: z.literal("relationship_value"),
    selector: RelationshipSelectorSchema,
    field: z.enum(["affection", "trust", "conflict"]),
    operation: z.enum(["add", "set"]),
    value: z.number().finite(),
  })
  .strict();

export const RelationshipCreationDefinitionSchema = z
  .object({
    id: NonEmptyStringSchema,
    characterId: NonEmptyStringSchema,
    type: RelationshipTypeSchema,
    displayName: NonEmptyStringSchema,
    affection: ScaleSchema,
    trust: ScaleSchema,
    conflict: ScaleSchema,
    tags: z.array(NonEmptyStringSchema),
  })
  .strict();

export const CreateRelationshipEffectSchema = z
  .object({
    type: z.literal("create_relationship"),
    relationship: RelationshipCreationDefinitionSchema,
    conflictPolicy: z.enum(["error", "ignore"]),
  })
  .strict();

export const DeactivateRelationshipEffectSchema = z
  .object({
    type: z.literal("deactivate_relationship"),
    relationshipId: NonEmptyStringSchema,
  })
  .strict();

export const ScheduleEventEffectSchema = z
  .object({
    type: z.literal("schedule_event"),
    followUp: FollowUpDefinitionSchema,
  })
  .strict();

export const GameEffectSchema = z.union([
  PlayerStatEffectSchema,
  FootballAttributeEffectSchema,
  LifeStateEffectSchema,
  FootballStateEffectSchema,
  FlagEffectSchema,
  CounterEffectSchema,
  RelationshipValueEffectSchema,
  CreateRelationshipEffectSchema,
  DeactivateRelationshipEffectSchema,
  ScheduleEventEffectSchema,
]);
