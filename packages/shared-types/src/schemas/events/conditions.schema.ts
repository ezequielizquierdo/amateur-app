import { z } from "zod";

import { NonEmptyStringSchema } from "../common.schema.js";
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
  LifeStageSchema,
  RelationshipStatusSchema,
} from "../life.schema.js";
import { RelationshipTypeSchema } from "../relationship.schema.js";
import { HistoryKeySchema } from "../history-key.schema.js";
import { EventIdSchema } from "./event-common.schema.js";

const comparisonOperators = z.enum([
  "equals",
  "notEquals",
  "greaterThan",
  "greaterThanOrEqual",
  "lessThan",
  "lessThanOrEqual",
]);
const equalityOperators = z.enum(["equals", "notEquals"]);
const existenceOperators = z.enum(["exists", "notExists"]);
const membershipOperators = z.enum(["in", "notIn"]);

const numericStateFields = z.enum([
  "stats.mood",
  "stats.energy",
  "stats.health",
  "stats.family",
  "stats.friends",
  "stats.finances",
  "stats.footballLevel",
  "footballAttributes.talent",
  "footballAttributes.technique",
  "footballAttributes.physicalCondition",
  "footballAttributes.tacticalUnderstanding",
  "footballAttributes.discipline",
  "footballAttributes.currentForm",
  "footballAttributes.potential",
  "footballAttributes.injuryRisk",
  "life.age",
  "life.currentYear",
  "life.numberOfChildren",
  "football.teamTrust",
  "football.coachTrust",
  "football.professionalReputation",
  "football.amateurReputation",
  "football.salary",
  "football.marketValue",
  "currentSeason",
  "currentTurn",
]);

const stringStateFieldSchemas = {
  "life.lifeStage": LifeStageSchema,
  "life.educationStatus": EducationStatusSchema,
  "life.employmentStatus": EmploymentStatusSchema,
  "life.relationshipStatus": RelationshipStatusSchema,
  "life.occupationId": NonEmptyStringSchema,
  "life.employerId": NonEmptyStringSchema,
  "life.city": NonEmptyStringSchema,
  "life.country": NonEmptyStringSchema,
  "life.housingStatus": HousingStatusSchema,
  "football.status": FootballStatusSchema,
  "football.careerType": CareerTypeSchema,
  "football.currentTeamId": NonEmptyStringSchema,
  "football.currentClubId": NonEmptyStringSchema,
  "football.currentContractId": NonEmptyStringSchema,
  "football.currentAgentId": NonEmptyStringSchema,
  "football.teamRole": TeamRoleSchema,
  "football.retirementStatus": RetirementStatusSchema,
} as const;

const stringStateConditions = Object.entries(stringStateFieldSchemas).flatMap(
  ([field, valueSchema]) => [
    z
      .object({
        type: z.literal("state"),
        field: z.literal(field),
        operator: equalityOperators,
        value: valueSchema,
      })
      .strict(),
    z
      .object({
        type: z.literal("state"),
        field: z.literal(field),
        operator: membershipOperators,
        value: z.array(valueSchema).min(1),
      })
      .strict(),
  ],
);

export const AllowedStateConditionFieldSchema = z.enum([
  ...numericStateFields.options,
  ...Object.keys(stringStateFieldSchemas),
  "football.isInjured",
]);

export const StateConditionSchema = z.union([
  z
    .object({
      type: z.literal("state"),
      field: numericStateFields,
      operator: comparisonOperators,
      value: z.number().finite(),
    })
    .strict(),
  z
    .object({
      type: z.literal("state"),
      field: numericStateFields,
      operator: membershipOperators,
      value: z.array(z.number().finite()).min(1),
    })
    .strict(),
  ...stringStateConditions,
  z
    .object({
      type: z.literal("state"),
      field: z.literal("football.isInjured"),
      operator: equalityOperators,
      value: z.boolean(),
    })
    .strict(),
  z
    .object({
      type: z.literal("state"),
      field: z.literal("football.isInjured"),
      operator: membershipOperators,
      value: z.array(z.boolean()).min(1),
    })
    .strict(),
  z
    .object({
      type: z.literal("state"),
      field: AllowedStateConditionFieldSchema,
      operator: existenceOperators,
    })
    .strict(),
]);

const flagValueSchema = z.union([z.boolean(), z.number().finite(), z.string()]);

export const FlagConditionSchema = z.union([
  z
    .object({
      type: z.literal("flag"),
      key: HistoryKeySchema,
      operator: equalityOperators,
      value: flagValueSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("flag"),
      key: HistoryKeySchema,
      operator: existenceOperators,
    })
    .strict(),
]);

export const CounterConditionSchema = z
  .object({
    type: z.literal("counter"),
    key: HistoryKeySchema,
    operator: comparisonOperators,
    value: z.number().finite(),
  })
  .strict();

export const RelationshipSelectorSchema = z
  .object({
    relationshipId: NonEmptyStringSchema.optional(),
    type: RelationshipTypeSchema.optional(),
    requiredTags: z.array(NonEmptyStringSchema).min(1).optional(),
  })
  .strict()
  .refine(
    (selector) =>
      selector.relationshipId !== undefined ||
      selector.type !== undefined ||
      selector.requiredTags !== undefined,
    "Relationship selector must contain at least one criterion",
  );

export const RelationshipExistsConditionSchema = z
  .object({
    type: z.literal("relationship"),
    mode: z.literal("exists"),
    selector: RelationshipSelectorSchema,
    operator: existenceOperators,
  })
  .strict();

export const RelationshipValueConditionSchema = z.union([
  z
    .object({
      type: z.literal("relationship"),
      mode: z.literal("value"),
      selector: RelationshipSelectorSchema,
      field: z.enum(["affection", "trust", "conflict"]),
      operator: comparisonOperators,
      value: z.number().finite(),
    })
    .strict(),
  z
    .object({
      type: z.literal("relationship"),
      mode: z.literal("value"),
      selector: RelationshipSelectorSchema,
      field: z.enum(["isActive", "isAlive"]),
      operator: equalityOperators,
      value: z.boolean(),
    })
    .strict(),
]);

export const RelationshipConditionSchema = z.union([
  RelationshipExistsConditionSchema,
  RelationshipValueConditionSchema,
]);

export const EventHistoryConditionSchema = z.union([
  z
    .object({
      type: z.literal("event_history"),
      eventId: EventIdSchema,
      operator: z.enum(["completed", "notCompleted"]),
    })
    .strict(),
  z
    .object({
      type: z.literal("event_history"),
      eventId: EventIdSchema,
      operator: z.literal("completedAtLeast"),
      count: z.number().int().positive(),
    })
    .strict(),
]);

export const EventConditionSchema = z.union([
  StateConditionSchema,
  FlagConditionSchema,
  CounterConditionSchema,
  RelationshipConditionSchema,
  EventHistoryConditionSchema,
]);

export const EventConditionGroupSchema = z
  .object({
    mode: z.enum(["all", "any"]),
    conditions: z.array(EventConditionSchema).min(1),
    negate: z.boolean().optional(),
  })
  .strict();
