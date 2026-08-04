import { z } from "zod";

import {
  NonEmptyStringSchema,
  NonNegativeIntegerSchema,
} from "./common.schema.js";
import { JsonValueSchema } from "./json-value.schema.js";

export const ScheduledEventTriggerSchema = z.enum([
  "turn",
  "age",
  "season",
  "condition",
]);

export const EventConditionSchema = z
  .object({
    field: NonEmptyStringSchema,
    operator: z.enum([
      "equals",
      "notEquals",
      "greaterThan",
      "greaterThanOrEqual",
      "lessThan",
      "lessThanOrEqual",
      "in",
      "notIn",
    ]),
    value: JsonValueSchema,
  })
  .strict();

export const ScheduledEventSchema = z
  .object({
    id: NonEmptyStringSchema,
    eventId: NonEmptyStringSchema,
    triggerType: ScheduledEventTriggerSchema,
    triggerValue: z.number().finite().optional(),
    conditions: z.array(EventConditionSchema).optional(),
    sourceEventId: NonEmptyStringSchema,
    priority: z.number().int(),
    createdAtTurn: NonNegativeIntegerSchema,
    consumed: z.boolean(),
  })
  .strict();
