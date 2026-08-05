import { z } from "zod";

import { EventConditionGroupSchema } from "./conditions.schema.js";
import { GameEffectSchema } from "./effects.schema.js";
import {
  ChoiceIdSchema,
  EventTextSchema,
  OutcomeIdSchema,
} from "./event-common.schema.js";
import { FollowUpDefinitionSchema } from "./follow-up.schema.js";

export const ProbabilisticOutcomeSchema = z
  .object({
    id: OutcomeIdSchema,
    weight: z.number().int().positive(),
    availability: EventConditionGroupSchema.optional(),
    effects: z.array(GameEffectSchema),
    followUps: z.array(FollowUpDefinitionSchema).min(1).optional(),
  })
  .strict()
  .refine(
    (outcome) => outcome.effects.length > 0 || outcome.followUps !== undefined,
    "Outcome must contain at least one effect or follow-up",
  );

export const EventChoiceSchema = z
  .object({
    id: ChoiceIdSchema,
    label: EventTextSchema,
    description: EventTextSchema.optional(),
    availability: EventConditionGroupSchema.optional(),
    effects: z.array(GameEffectSchema),
    outcomes: z.array(ProbabilisticOutcomeSchema).min(1).optional(),
    followUps: z.array(FollowUpDefinitionSchema).min(1).optional(),
  })
  .strict()
  .superRefine((choice, context) => {
    if (
      choice.effects.length === 0 &&
      choice.outcomes === undefined &&
      choice.followUps === undefined
    ) {
      context.addIssue({
        code: "custom",
        message: "Choice must contain effects, outcomes, or follow-ups",
      });
    }

    if (choice.outcomes !== undefined) {
      const ids = new Set<string>();
      choice.outcomes.forEach((outcome, index) => {
        if (ids.has(outcome.id)) {
          context.addIssue({
            code: "custom",
            message: "Outcome IDs must be unique within a choice",
            path: ["outcomes", index, "id"],
          });
        }
        ids.add(outcome.id);
      });
    }
  });
