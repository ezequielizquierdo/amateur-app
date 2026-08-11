import { z } from "zod";

import {
  NonEmptyStringSchema,
  NonNegativeIntegerSchema,
} from "./common.schema.js";
import { EventConditionGroupSchema } from "./events/conditions.schema.js";
import { EventIdSchema } from "./events/event-common.schema.js";
import { persistibleSchema } from "../validation/persistible-schema.js";

export const ScheduledEventTriggerSchema = z.enum([
  "turn",
  "age",
  "season",
  "condition",
]);

const ScheduledEventCommonShape = {
  id: NonEmptyStringSchema,
  eventId: EventIdSchema,
  sourceEventId: EventIdSchema,
  priority: z.number().int(),
  createdAtTurn: NonNegativeIntegerSchema,
  consumed: z.boolean(),
} as const;

const ScheduledEventStructuralSchema = z.discriminatedUnion("triggerType", [
  z
    .object({
      ...ScheduledEventCommonShape,
      triggerType: z.literal("turn"),
      triggerValue: NonNegativeIntegerSchema,
    })
    .strict(),
  z
    .object({
      ...ScheduledEventCommonShape,
      triggerType: z.literal("age"),
      triggerValue: z.number().int().min(14),
    })
    .strict(),
  z
    .object({
      ...ScheduledEventCommonShape,
      triggerType: z.literal("season"),
      triggerValue: z.number().int().min(1),
    })
    .strict(),
  z
    .object({
      ...ScheduledEventCommonShape,
      triggerType: z.literal("condition"),
      conditions: EventConditionGroupSchema,
    })
    .strict(),
]);

export const ScheduledEventSchema = persistibleSchema(
  ScheduledEventStructuralSchema,
);
