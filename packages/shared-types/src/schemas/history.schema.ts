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
import { HistoryKeySchema } from "./history-key.schema.js";
import { persistibleSchema } from "../validation/persistible-schema.js";

function historyRecordSchema<TValue extends z.ZodType>(value: TValue) {
  return z
    .unknown()
    .superRefine((input, context) => {
      if (typeof input !== "object" || input === null || Array.isArray(input)) {
        return;
      }

      for (const key of Object.keys(input)) {
        const result = HistoryKeySchema.safeParse(key);
        if (!result.success) {
          for (const issue of result.error.issues) {
            context.addIssue({
              code: "custom",
              message: issue.message,
              path: [key],
            });
          }
        }
      }
    })
    .pipe(z.record(HistoryKeySchema, value));
}

const DecisionRecordStructuralSchema = z
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

export const DecisionRecordSchema = persistibleSchema(
  DecisionRecordStructuralSchema,
);

export const HistoryFlagValueSchema = z.union([
  z.boolean(),
  z.number().finite(),
  z.string(),
]);

export const GameHistorySchema = z
  .object({
    decisions: z.array(DecisionRecordSchema),
    flags: historyRecordSchema(HistoryFlagValueSchema),
    counters: historyRecordSchema(NonNegativeIntegerSchema),
    completedEventIds: z.array(NonEmptyStringSchema),
    recentEventIds: z.array(NonEmptyStringSchema),
    formerTeamIds: z.array(NonEmptyStringSchema),
    formerClubIds: z.array(NonEmptyStringSchema),
  })
  .strict();
