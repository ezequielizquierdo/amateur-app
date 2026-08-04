import { z } from "zod";

import { ScaleSchema } from "./common.schema.js";

export const FootballAttributesSchema = z
  .object({
    talent: ScaleSchema,
    technique: ScaleSchema,
    physicalCondition: ScaleSchema,
    tacticalUnderstanding: ScaleSchema,
    discipline: ScaleSchema,
    currentForm: ScaleSchema,
    potential: ScaleSchema,
    injuryRisk: ScaleSchema,
  })
  .strict();
