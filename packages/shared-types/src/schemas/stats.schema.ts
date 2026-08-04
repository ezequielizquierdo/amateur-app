import { z } from "zod";

import { ScaleSchema } from "./common.schema.js";

export const PlayerStatsSchema = z
  .object({
    mood: ScaleSchema,
    energy: ScaleSchema,
    health: ScaleSchema,
    family: ScaleSchema,
    friends: ScaleSchema,
    finances: ScaleSchema,
    footballLevel: ScaleSchema,
  })
  .strict();
