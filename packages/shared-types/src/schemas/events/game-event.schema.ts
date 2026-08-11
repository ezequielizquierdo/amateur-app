import { z } from "zod";

import { persistibleSchema } from "../../validation/persistible-schema.js";
import { CareerTypeSchema, FootballStatusSchema } from "../football.schema.js";
import { LifeStageSchema } from "../life.schema.js";
import { EventChoiceSchema } from "./choices.schema.js";
import { EventConditionGroupSchema } from "./conditions.schema.js";
import {
  EventCategorySchema,
  EventIdSchema,
  EventNarrativeMetadataSchema,
  EventTextSchema,
} from "./event-common.schema.js";
import { EventSelectionSchema } from "./event-selection.schema.js";

export const EventAvailabilitySchema = z
  .object({
    minimumAge: z.number().int().min(14).optional(),
    maximumAge: z.number().int().min(14).optional(),
    lifeStages: z.array(LifeStageSchema).min(1).optional(),
    careerTypes: z.array(CareerTypeSchema).min(1).optional(),
    footballStatuses: z.array(FootballStatusSchema).min(1).optional(),
    conditions: EventConditionGroupSchema.optional(),
  })
  .strict()
  .refine(
    (availability) =>
      availability.minimumAge === undefined ||
      availability.maximumAge === undefined ||
      availability.maximumAge >= availability.minimumAge,
    {
      message: "maximumAge cannot be lower than minimumAge",
      path: ["maximumAge"],
    },
  );

const GameEventObjectSchema = z
  .object({
    id: EventIdSchema,
    version: z.number().int().positive(),
    title: EventTextSchema,
    description: EventTextSchema,
    category: EventCategorySchema,
    tags: z.array(EventTextSchema),
    availability: EventAvailabilitySchema,
    selection: EventSelectionSchema,
    choices: z.array(EventChoiceSchema).min(1),
    narrative: EventNarrativeMetadataSchema.optional(),
  })
  .strict()
  .superRefine((event, context) => {
    const ids = new Set<string>();
    event.choices.forEach((choice, index) => {
      if (ids.has(choice.id)) {
        context.addIssue({
          code: "custom",
          message: "Choice IDs must be unique within an event",
          path: ["choices", index, "id"],
        });
      }
      ids.add(choice.id);
    });
  });

export const GameEventSchema = persistibleSchema(GameEventObjectSchema);
