import { z } from "zod";

import {
  NonEmptyStringSchema,
  NonNegativeIntegerSchema,
} from "./common.schema.js";
import { AppliedEffectSchema } from "./events/applied-effect.schema.js";
import {
  ChoiceIdSchema,
  EventIdSchema,
  OutcomeIdSchema,
} from "./events/event-common.schema.js";

export const DecisionRecordSchema = z
  .object({
    eventId: EventIdSchema,
    eventVersion: z.number().int().positive(),
    choiceId: ChoiceIdSchema,
    outcomeId: OutcomeIdSchema.optional(),
    age: NonNegativeIntegerSchema,
    season: NonNegativeIntegerSchema,
    turn: NonNegativeIntegerSchema,
    immediateEffects: z.array(AppliedEffectSchema),
  })
  .strict();

export const HistoryFlagValueSchema = z.union([
  z.boolean(),
  z.number().finite(),
  z.string(),
]);

export const GameHistorySchema = z
  .object({
    decisions: z.array(DecisionRecordSchema),
    flags: z.record(z.string(), HistoryFlagValueSchema),
    counters: z.record(z.string(), z.number().finite()),
    completedEventIds: z.array(NonEmptyStringSchema),
    recentEventIds: z.array(NonEmptyStringSchema),
    formerTeamIds: z.array(NonEmptyStringSchema),
    formerClubIds: z.array(NonEmptyStringSchema),
  })
  .strict();
