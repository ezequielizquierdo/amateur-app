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

const nonEmptyStringStateFields = z.enum([
  "life.occupationId",
  "life.employerId",
  "life.city",
  "life.country",
  "football.currentTeamId",
  "football.currentClubId",
  "football.currentContractId",
  "football.currentAgentId",
]);

const lifeStageStateField = z.literal("life.lifeStage");
const educationStatusStateField = z.literal("life.educationStatus");
const employmentStatusStateField = z.literal("life.employmentStatus");
const relationshipStatusStateField = z.literal("life.relationshipStatus");
const housingStatusStateField = z.literal("life.housingStatus");
const footballStatusStateField = z.literal("football.status");
const careerTypeStateField = z.literal("football.careerType");
const teamRoleStateField = z.literal("football.teamRole");
const retirementStatusStateField = z.literal("football.retirementStatus");
const isInjuredStateField = z.literal("football.isInjured");

function createEqualityAndMembershipConditions<
  TFieldSchema extends z.ZodType<string>,
  TValueSchema extends z.ZodType,
>(fieldSchema: TFieldSchema, valueSchema: TValueSchema) {
  return [
    z
      .object({
        type: z.literal("state"),
        field: fieldSchema,
        operator: equalityOperators,
        value: valueSchema,
      })
      .strict(),
    z
      .object({
        type: z.literal("state"),
        field: fieldSchema,
        operator: membershipOperators,
        value: z.array(valueSchema).min(1),
      })
      .strict(),
  ] as const;
}

const nonEmptyStringStateConditions = createEqualityAndMembershipConditions(
  nonEmptyStringStateFields,
  NonEmptyStringSchema,
);
const lifeStageStateConditions = createEqualityAndMembershipConditions(
  lifeStageStateField,
  LifeStageSchema,
);
const educationStatusStateConditions = createEqualityAndMembershipConditions(
  educationStatusStateField,
  EducationStatusSchema,
);
const employmentStatusStateConditions = createEqualityAndMembershipConditions(
  employmentStatusStateField,
  EmploymentStatusSchema,
);
const relationshipStatusStateConditions = createEqualityAndMembershipConditions(
  relationshipStatusStateField,
  RelationshipStatusSchema,
);
const housingStatusStateConditions = createEqualityAndMembershipConditions(
  housingStatusStateField,
  HousingStatusSchema,
);
const footballStatusStateConditions = createEqualityAndMembershipConditions(
  footballStatusStateField,
  FootballStatusSchema,
);
const careerTypeStateConditions = createEqualityAndMembershipConditions(
  careerTypeStateField,
  CareerTypeSchema,
);
const teamRoleStateConditions = createEqualityAndMembershipConditions(
  teamRoleStateField,
  TeamRoleSchema,
);
const retirementStatusStateConditions = createEqualityAndMembershipConditions(
  retirementStatusStateField,
  RetirementStatusSchema,
);
const isInjuredStateConditions = createEqualityAndMembershipConditions(
  isInjuredStateField,
  z.boolean(),
);

export const AllowedStateConditionFieldSchema = z.enum([
  ...numericStateFields.options,
  ...nonEmptyStringStateFields.options,
  lifeStageStateField.value,
  educationStatusStateField.value,
  employmentStatusStateField.value,
  relationshipStatusStateField.value,
  housingStatusStateField.value,
  footballStatusStateField.value,
  careerTypeStateField.value,
  teamRoleStateField.value,
  retirementStatusStateField.value,
  isInjuredStateField.value,
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
  ...nonEmptyStringStateConditions,
  ...lifeStageStateConditions,
  ...educationStatusStateConditions,
  ...employmentStatusStateConditions,
  ...relationshipStatusStateConditions,
  ...housingStatusStateConditions,
  ...footballStatusStateConditions,
  ...careerTypeStateConditions,
  ...teamRoleStateConditions,
  ...retirementStatusStateConditions,
  ...isInjuredStateConditions,
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
