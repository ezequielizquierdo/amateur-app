import { z } from "zod";

export const EventRepeatPolicySchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("once_per_run") }).strict(),
  z.object({ type: z.literal("repeatable") }).strict(),
  z
    .object({
      type: z.literal("cooldown"),
      turns: z.number().int().positive().optional(),
      seasons: z.number().int().positive().optional(),
    })
    .strict()
    .refine(
      (policy) => policy.turns !== undefined || policy.seasons !== undefined,
      "Cooldown must define turns, seasons, or both",
    ),
]);

export const MandatoryEventSelectionSchema = z
  .object({
    mode: z.literal("mandatory"),
    priority: z.number().int(),
    repeatPolicy: EventRepeatPolicySchema,
  })
  .strict();

export const WeightedEventSelectionSchema = z
  .object({
    mode: z.literal("weighted"),
    priority: z.number().int(),
    weight: z.number().int().positive(),
    repeatPolicy: EventRepeatPolicySchema,
  })
  .strict();

export const EventSelectionSchema = z.union([
  MandatoryEventSelectionSchema,
  WeightedEventSelectionSchema,
]);
