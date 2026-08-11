import { z } from "zod";

import { NonEmptyStringSchema } from "../common.schema.js";
import { RelationshipSchema } from "../relationship.schema.js";
import { ScheduledEventSchema } from "../scheduled-event.schema.js";
import { persistibleSchema } from "../../validation/persistible-schema.js";
import {
  CounterEffectRequestedSchema,
  CreateRelationshipEffectRequestedSchema,
  DeactivateRelationshipEffectRequestedSchema,
  FlagEffectRequestedSchema,
  FootballAttributeEffectRequestedSchema,
  FootballStateEffectRequestedSchema,
  LifeStateEffectRequestedSchema,
  PlayerStatEffectRequestedSchema,
  RelationshipValueEffectRequestedSchema,
  ScheduleEventEffectRequestedSchema,
} from "./effects.schema.js";
import { OutcomeIdSchema } from "./event-common.schema.js";

export const AppliedEffectSourceSchema = z.discriminatedUnion("phase", [
  z.object({ phase: z.literal("choice") }).strict(),
  z
    .object({ phase: z.literal("outcome"), outcomeId: OutcomeIdSchema })
    .strict(),
]);

const SourceEffectIndexSchema = z.number().int().nonnegative();
const AppliedScalarValueSchema = z.union([
  z.boolean(),
  z.number().finite(),
  z.string(),
]);

const AbsentSnapshotSchema = z.object({ exists: z.literal(false) }).strict();
const AppliedScalarSnapshotSchema = z.discriminatedUnion("exists", [
  AbsentSnapshotSchema,
  z
    .object({ exists: z.literal(true), value: AppliedScalarValueSchema })
    .strict(),
]);
const PresentNumberSnapshotSchema = z
  .object({ exists: z.literal(true), value: z.number().finite() })
  .strict();
const AppliedRelationshipSnapshotSchema = z.discriminatedUnion("exists", [
  AbsentSnapshotSchema,
  z.object({ exists: z.literal(true), value: RelationshipSchema }).strict(),
]);
const PresentRelationshipSnapshotSchema =
  AppliedRelationshipSnapshotSchema.options[1];
const PresentInactiveRelationshipSnapshotSchema = z
  .object({
    exists: z.literal(true),
    value: RelationshipSchema.extend({ isActive: z.literal(false) }).strict(),
  })
  .strict();
const AppliedScheduledEventSnapshotSchema = z.discriminatedUnion("exists", [
  AbsentSnapshotSchema,
  z.object({ exists: z.literal(true), value: ScheduledEventSchema }).strict(),
]);
const PresentScheduledEventSnapshotSchema =
  AppliedScheduledEventSnapshotSchema.options[1];

const commonShape = {
  source: AppliedEffectSourceSchema,
  sourceEffectIndex: SourceEffectIndexSchema,
} as const;

function scalarEffectSchema<TType extends string, TRequested extends z.ZodType>(
  type: TType,
  requested: TRequested,
) {
  return z
    .object({
      type: z.literal(type),
      ...commonShape,
      status: z.enum(["applied", "no_change"]),
      requested,
      previous: AppliedScalarSnapshotSchema,
      resulting: AppliedScalarSnapshotSchema,
    })
    .strict();
}

const AppliedPlayerStatEffectSchema = scalarEffectSchema(
  "player_stat",
  PlayerStatEffectRequestedSchema,
);
const AppliedFootballAttributeEffectSchema = scalarEffectSchema(
  "football_attribute",
  FootballAttributeEffectRequestedSchema,
);
const AppliedLifeStateEffectSchema = scalarEffectSchema(
  "life_state",
  LifeStateEffectRequestedSchema,
);
const AppliedFootballStateEffectSchema = scalarEffectSchema(
  "football_state",
  FootballStateEffectRequestedSchema,
);
const AppliedFlagEffectSchema = scalarEffectSchema(
  "flag",
  FlagEffectRequestedSchema,
);
const AppliedCounterEffectSchema = scalarEffectSchema(
  "counter",
  CounterEffectRequestedSchema,
);

const AppliedRelationshipValueEffectSchema = z
  .object({
    type: z.literal("relationship_value"),
    ...commonShape,
    status: z.enum(["applied", "no_change"]),
    requested: RelationshipValueEffectRequestedSchema,
    relationshipId: NonEmptyStringSchema,
    previous: PresentNumberSnapshotSchema,
    resulting: PresentNumberSnapshotSchema,
  })
  .strict();

const AppliedCreateRelationshipEffectSchema = z
  .object({
    type: z.literal("create_relationship"),
    ...commonShape,
    status: z.literal("applied"),
    requested: CreateRelationshipEffectRequestedSchema,
    previous: AbsentSnapshotSchema,
    resulting: PresentRelationshipSnapshotSchema,
  })
  .strict();

const IgnoredCreateRelationshipRequestedSchema =
  CreateRelationshipEffectRequestedSchema.extend({
    conflictPolicy: z.literal("ignore"),
  }).strict();

const IgnoredCreateRelationshipEffectSchema = z
  .object({
    type: z.literal("create_relationship"),
    ...commonShape,
    status: z.literal("ignored"),
    requested: IgnoredCreateRelationshipRequestedSchema,
    previous: PresentRelationshipSnapshotSchema,
    resulting: PresentRelationshipSnapshotSchema,
  })
  .strict();

const AppliedDeactivateRelationshipEffectSchema = z
  .object({
    type: z.literal("deactivate_relationship"),
    ...commonShape,
    status: z.enum(["applied", "no_change"]),
    requested: DeactivateRelationshipEffectRequestedSchema,
    previous: PresentRelationshipSnapshotSchema,
    resulting: PresentInactiveRelationshipSnapshotSchema,
  })
  .strict();

const AppliedScheduleEventEffectSchema = z
  .object({
    type: z.literal("schedule_event"),
    ...commonShape,
    status: z.literal("applied"),
    requested: ScheduleEventEffectRequestedSchema,
    previous: AbsentSnapshotSchema,
    resulting: PresentScheduledEventSnapshotSchema,
  })
  .strict();

const AppliedEffectStructuralSchema = z.union([
  AppliedPlayerStatEffectSchema,
  AppliedFootballAttributeEffectSchema,
  AppliedLifeStateEffectSchema,
  AppliedFootballStateEffectSchema,
  AppliedFlagEffectSchema,
  AppliedCounterEffectSchema,
  AppliedRelationshipValueEffectSchema,
  AppliedCreateRelationshipEffectSchema,
  IgnoredCreateRelationshipEffectSchema,
  AppliedDeactivateRelationshipEffectSchema,
  AppliedScheduleEventEffectSchema,
]);

export const AppliedEffectSchema = persistibleSchema(
  AppliedEffectStructuralSchema,
);
