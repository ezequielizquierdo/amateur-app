import { z } from "zod";

import {
  ChallengingTraitSchema,
  DominantFootSchema,
  FootballPositionSchema,
  NonEmptyStringSchema,
  PlayerGenderSchema,
  PositiveTraitSchema,
} from "./common.schema.js";

export const PlayerProfileSchema = z
  .object({
    id: NonEmptyStringSchema,
    name: NonEmptyStringSchema,
    gender: PlayerGenderSchema,
    birthCountry: NonEmptyStringSchema,
    birthCity: NonEmptyStringSchema.optional(),
    preferredPosition: FootballPositionSchema,
    dominantFoot: DominantFootSchema,
    startingAge: z.literal(14),
    positiveTrait: PositiveTraitSchema,
    challengingTrait: ChallengingTraitSchema,
  })
  .strict();
