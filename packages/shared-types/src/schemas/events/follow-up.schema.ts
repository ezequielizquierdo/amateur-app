import { z } from "zod";

import { EventConditionGroupSchema } from "./conditions.schema.js";
import { EventIdSchema } from "./event-common.schema.js";

export const FollowUpTriggerSchema = z.discriminatedUnion("type", [
  z
    .object({ type: z.literal("turn"), afterTurns: z.number().int().min(1) })
    .strict(),
  z
    .object({ type: z.literal("age"), atAge: z.number().int().min(14) })
    .strict(),
  z
    .object({ type: z.literal("season"), atSeason: z.number().int().min(1) })
    .strict(),
  z
    .object({
      type: z.literal("condition"),
      conditions: EventConditionGroupSchema,
    })
    .strict(),
]);

export const FollowUpDefinitionSchema = z
  .object({
    eventId: EventIdSchema,
    trigger: FollowUpTriggerSchema,
    priority: z.number().int(),
  })
  .strict();
