import { z } from "zod";

import {
  NonEmptyStringSchema,
  NonNegativeIntegerSchema,
} from "./common.schema.js";

export const LifeStageSchema = z.enum([
  "adolescence",
  "early_adulthood",
  "adulthood",
  "maturity",
  "late_career",
]);
export const EducationStatusSchema = z.enum([
  "secondary_school",
  "secondary_completed",
  "secondary_abandoned",
  "university",
  "university_paused",
  "university_completed",
  "not_studying",
]);
export const EmploymentStatusSchema = z.enum([
  "not_working",
  "part_time",
  "full_time",
  "self_employed",
  "unemployed",
  "retired",
]);
export const RelationshipStatusSchema = z.enum([
  "single",
  "dating",
  "committed",
  "married",
  "separated",
  "widowed",
]);
export const HousingStatusSchema = z.enum([
  "family_home",
  "renting",
  "owner",
  "club_housing",
  "shared_housing",
  "temporary",
]);

export const LifeStateSchema = z
  .object({
    age: NonNegativeIntegerSchema,
    currentYear: z.number().int(),
    lifeStage: LifeStageSchema,
    educationStatus: EducationStatusSchema,
    employmentStatus: EmploymentStatusSchema,
    relationshipStatus: RelationshipStatusSchema,
    occupationId: NonEmptyStringSchema.optional(),
    employerId: NonEmptyStringSchema.optional(),
    city: NonEmptyStringSchema,
    country: NonEmptyStringSchema,
    numberOfChildren: NonNegativeIntegerSchema,
    petIds: z.array(NonEmptyStringSchema),
    housingStatus: HousingStatusSchema,
  })
  .strict();
