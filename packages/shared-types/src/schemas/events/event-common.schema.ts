import { z } from "zod";

import { NonEmptyStringSchema } from "../common.schema.js";

export const ContentIdSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/, "Invalid content identifier");

export const EventIdSchema = ContentIdSchema;
export const ChoiceIdSchema = ContentIdSchema;
export const OutcomeIdSchema = ContentIdSchema;

export const EventCategorySchema = z.enum([
  "football",
  "education",
  "work",
  "family",
  "friendship",
  "relationship",
  "health",
  "finances",
  "relocation",
  "retirement",
]);

export const EventToneSchema = z.enum([
  "positive",
  "negative",
  "neutral",
  "dramatic",
  "humorous",
]);

export const EventNarrativeMetadataSchema = z
  .object({
    chainId: ContentIdSchema.optional(),
    step: z.number().int().positive().optional(),
    tone: EventToneSchema.optional(),
  })
  .strict();

export const EventTextSchema = NonEmptyStringSchema;
