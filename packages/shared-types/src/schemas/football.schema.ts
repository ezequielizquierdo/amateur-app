import { z } from "zod";

import {
  NonEmptyStringSchema,
  NonNegativeIntegerSchema,
  NonNegativeNumberSchema,
  ScaleSchema,
} from "./common.schema.js";

export const FootballStatusSchema = z.enum([
  "school_team",
  "friends_team",
  "trying_out",
  "academy",
  "reserve",
  "professional",
  "semi_professional",
  "amateur",
  "without_team",
  "retired",
]);
export const CareerTypeSchema = z.enum([
  "undecided",
  "professional_path",
  "amateur_path",
  "mixed",
]);
export const TeamRoleSchema = z.enum([
  "prospect",
  "substitute",
  "rotation",
  "starter",
  "important",
  "captain",
  "excluded",
]);
export const RetirementStatusSchema = z.enum([
  "not_retired",
  "considering",
  "temporarily_retired",
  "permanently_retired",
]);

export const FootballStateSchema = z
  .object({
    status: FootballStatusSchema,
    careerType: CareerTypeSchema,
    currentTeamId: NonEmptyStringSchema.optional(),
    currentClubId: NonEmptyStringSchema.optional(),
    currentContractId: NonEmptyStringSchema.optional(),
    currentAgentId: NonEmptyStringSchema.optional(),
    teamRole: TeamRoleSchema,
    teamTrust: ScaleSchema,
    coachTrust: ScaleSchema,
    professionalReputation: ScaleSchema,
    amateurReputation: ScaleSchema,
    salary: NonNegativeNumberSchema,
    marketValue: NonNegativeNumberSchema,
    seasonMatches: NonNegativeIntegerSchema,
    seasonGoals: NonNegativeIntegerSchema,
    seasonAssists: NonNegativeIntegerSchema,
    careerMatches: NonNegativeIntegerSchema,
    careerGoals: NonNegativeIntegerSchema,
    careerAssists: NonNegativeIntegerSchema,
    isInjured: z.boolean(),
    currentInjuryId: NonEmptyStringSchema.optional(),
    retirementStatus: RetirementStatusSchema,
  })
  .strict()
  .superRefine((football, context) => {
    if (football.isInjured && football.currentInjuryId === undefined) {
      context.addIssue({
        code: "custom",
        message: "An active injury requires currentInjuryId",
        path: ["currentInjuryId"],
      });
    }
    if (!football.isInjured && football.currentInjuryId !== undefined) {
      context.addIssue({
        code: "custom",
        message:
          "currentInjuryId must be absent when the player is not injured",
        path: ["currentInjuryId"],
      });
    }
    if (
      football.retirementStatus === "permanently_retired" &&
      football.status !== "retired"
    ) {
      context.addIssue({
        code: "custom",
        message: "Permanent retirement requires football status retired",
        path: ["status"],
      });
    }
  });
