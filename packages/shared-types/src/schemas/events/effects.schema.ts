import { z } from "zod";

import { NonEmptyStringSchema, ScaleSchema } from "../common.schema.js";
import {
  CareerTypeSchema,
  FootballStatusSchema,
  RetirementStatusSchema,
  TeamRoleSchema,
} from "../football.schema.js";
import {
  EducationStatusSchema,
  EmploymentStatusSchema,
  HousingStatusSchema,
  RelationshipStatusSchema,
} from "../life.schema.js";
import { RelationshipTypeSchema } from "../relationship.schema.js";
import { HistoryKeySchema } from "../history-key.schema.js";
import { RelationshipSelectorSchema } from "./conditions.schema.js";
import { FollowUpDefinitionSchema } from "./follow-up.schema.js";

export const PlayerStatEffectSchema = z
  .object({
    type: z.literal("player_stat"),
    field: z.enum([
      "mood",
      "energy",
      "health",
      "family",
      "friends",
      "finances",
    ]),
    operation: z.enum(["add", "set", "multiply"]),
    value: z.number().finite(),
  })
  .strict();

export const FootballAttributeEffectSchema = z
  .object({
    type: z.literal("football_attribute"),
    field: z.enum([
      "talent",
      "technique",
      "physicalCondition",
      "tacticalUnderstanding",
      "discipline",
      "currentForm",
      "potential",
      "injuryRisk",
    ]),
    operation: z.enum(["add", "set", "multiply"]),
    value: z.number().finite(),
  })
  .strict();

function setRequestedSchema<
  const TField extends string,
  TValueSchema extends z.ZodType,
>(field: TField, value: TValueSchema) {
  return z
    .object({
      field: z.literal(field),
      operation: z.literal("set"),
      value,
    })
    .strict();
}

const LifeEducationStatusSetRequestedSchema = setRequestedSchema(
  "educationStatus",
  EducationStatusSchema,
);
const LifeEmploymentStatusSetRequestedSchema = setRequestedSchema(
  "employmentStatus",
  EmploymentStatusSchema,
);
const LifeRelationshipStatusSetRequestedSchema = setRequestedSchema(
  "relationshipStatus",
  RelationshipStatusSchema,
);
const LifeOccupationIdSetRequestedSchema = setRequestedSchema(
  "occupationId",
  NonEmptyStringSchema,
);
const LifeEmployerIdSetRequestedSchema = setRequestedSchema(
  "employerId",
  NonEmptyStringSchema,
);
const LifeCitySetRequestedSchema = setRequestedSchema(
  "city",
  NonEmptyStringSchema,
);
const LifeCountrySetRequestedSchema = setRequestedSchema(
  "country",
  NonEmptyStringSchema,
);
const LifeNumberOfChildrenSetRequestedSchema = setRequestedSchema(
  "numberOfChildren",
  z.number().int().nonnegative(),
);
const LifeHousingStatusSetRequestedSchema = setRequestedSchema(
  "housingStatus",
  HousingStatusSchema,
);
const LifeNumberOfChildrenAddRequestedSchema = z
  .object({
    field: z.literal("numberOfChildren"),
    operation: z.literal("add"),
    value: z.number().int(),
  })
  .strict();
const LifeOptionalIdClearRequestedSchema = z
  .object({
    field: z.enum(["occupationId", "employerId"]),
    operation: z.literal("clear"),
  })
  .strict();

const lifeStateRequestedVariants = [
  LifeEducationStatusSetRequestedSchema,
  LifeEmploymentStatusSetRequestedSchema,
  LifeRelationshipStatusSetRequestedSchema,
  LifeOccupationIdSetRequestedSchema,
  LifeEmployerIdSetRequestedSchema,
  LifeCitySetRequestedSchema,
  LifeCountrySetRequestedSchema,
  LifeNumberOfChildrenSetRequestedSchema,
  LifeHousingStatusSetRequestedSchema,
  LifeNumberOfChildrenAddRequestedSchema,
  LifeOptionalIdClearRequestedSchema,
] as const;

export const LifeStateEffectRequestedSchema = z.union(
  lifeStateRequestedVariants,
);

export const LifeStateEffectSchema = z.union([
  LifeEducationStatusSetRequestedSchema.extend({
    type: z.literal("life_state"),
  }).strict(),
  LifeEmploymentStatusSetRequestedSchema.extend({
    type: z.literal("life_state"),
  }).strict(),
  LifeRelationshipStatusSetRequestedSchema.extend({
    type: z.literal("life_state"),
  }).strict(),
  LifeOccupationIdSetRequestedSchema.extend({
    type: z.literal("life_state"),
  }).strict(),
  LifeEmployerIdSetRequestedSchema.extend({
    type: z.literal("life_state"),
  }).strict(),
  LifeCitySetRequestedSchema.extend({ type: z.literal("life_state") }).strict(),
  LifeCountrySetRequestedSchema.extend({
    type: z.literal("life_state"),
  }).strict(),
  LifeNumberOfChildrenSetRequestedSchema.extend({
    type: z.literal("life_state"),
  }).strict(),
  LifeHousingStatusSetRequestedSchema.extend({
    type: z.literal("life_state"),
  }).strict(),
  LifeNumberOfChildrenAddRequestedSchema.extend({
    type: z.literal("life_state"),
  }).strict(),
  LifeOptionalIdClearRequestedSchema.extend({
    type: z.literal("life_state"),
  }).strict(),
]);

const FootballStatusSetRequestedSchema = setRequestedSchema(
  "status",
  FootballStatusSchema,
);
const FootballCareerTypeSetRequestedSchema = setRequestedSchema(
  "careerType",
  CareerTypeSchema,
);
const FootballCurrentTeamIdSetRequestedSchema = setRequestedSchema(
  "currentTeamId",
  NonEmptyStringSchema,
);
const FootballCurrentClubIdSetRequestedSchema = setRequestedSchema(
  "currentClubId",
  NonEmptyStringSchema,
);
const FootballCurrentContractIdSetRequestedSchema = setRequestedSchema(
  "currentContractId",
  NonEmptyStringSchema,
);
const FootballCurrentAgentIdSetRequestedSchema = setRequestedSchema(
  "currentAgentId",
  NonEmptyStringSchema,
);
const FootballTeamRoleSetRequestedSchema = setRequestedSchema(
  "teamRole",
  TeamRoleSchema,
);
const FootballTeamTrustSetRequestedSchema = setRequestedSchema(
  "teamTrust",
  ScaleSchema,
);
const FootballCoachTrustSetRequestedSchema = setRequestedSchema(
  "coachTrust",
  ScaleSchema,
);
const FootballProfessionalReputationSetRequestedSchema = setRequestedSchema(
  "professionalReputation",
  ScaleSchema,
);
const FootballAmateurReputationSetRequestedSchema = setRequestedSchema(
  "amateurReputation",
  ScaleSchema,
);
const FootballSalarySetRequestedSchema = setRequestedSchema(
  "salary",
  z.number().finite().nonnegative(),
);
const FootballMarketValueSetRequestedSchema = setRequestedSchema(
  "marketValue",
  z.number().finite().nonnegative(),
);
const FootballIsInjuredSetRequestedSchema = setRequestedSchema(
  "isInjured",
  z.boolean(),
);
const FootballCurrentInjuryIdSetRequestedSchema = setRequestedSchema(
  "currentInjuryId",
  NonEmptyStringSchema,
);
const FootballRetirementStatusSetRequestedSchema = setRequestedSchema(
  "retirementStatus",
  RetirementStatusSchema,
);
const FootballNumericAddRequestedSchema = z
  .object({
    field: z.enum([
      "teamTrust",
      "coachTrust",
      "professionalReputation",
      "amateurReputation",
      "salary",
      "marketValue",
    ]),
    operation: z.literal("add"),
    value: z.number().finite(),
  })
  .strict();
const FootballOptionalIdClearRequestedSchema = z
  .object({
    field: z.enum([
      "currentTeamId",
      "currentClubId",
      "currentContractId",
      "currentAgentId",
      "currentInjuryId",
    ]),
    operation: z.literal("clear"),
  })
  .strict();

const footballStateRequestedVariants = [
  FootballStatusSetRequestedSchema,
  FootballCareerTypeSetRequestedSchema,
  FootballCurrentTeamIdSetRequestedSchema,
  FootballCurrentClubIdSetRequestedSchema,
  FootballCurrentContractIdSetRequestedSchema,
  FootballCurrentAgentIdSetRequestedSchema,
  FootballTeamRoleSetRequestedSchema,
  FootballTeamTrustSetRequestedSchema,
  FootballCoachTrustSetRequestedSchema,
  FootballProfessionalReputationSetRequestedSchema,
  FootballAmateurReputationSetRequestedSchema,
  FootballSalarySetRequestedSchema,
  FootballMarketValueSetRequestedSchema,
  FootballIsInjuredSetRequestedSchema,
  FootballCurrentInjuryIdSetRequestedSchema,
  FootballRetirementStatusSetRequestedSchema,
  FootballNumericAddRequestedSchema,
  FootballOptionalIdClearRequestedSchema,
] as const;

export const FootballStateEffectRequestedSchema = z.union(
  footballStateRequestedVariants,
);

export const FootballStateEffectSchema = z.union([
  FootballStatusSetRequestedSchema.extend({
    type: z.literal("football_state"),
  }).strict(),
  FootballCareerTypeSetRequestedSchema.extend({
    type: z.literal("football_state"),
  }).strict(),
  FootballCurrentTeamIdSetRequestedSchema.extend({
    type: z.literal("football_state"),
  }).strict(),
  FootballCurrentClubIdSetRequestedSchema.extend({
    type: z.literal("football_state"),
  }).strict(),
  FootballCurrentContractIdSetRequestedSchema.extend({
    type: z.literal("football_state"),
  }).strict(),
  FootballCurrentAgentIdSetRequestedSchema.extend({
    type: z.literal("football_state"),
  }).strict(),
  FootballTeamRoleSetRequestedSchema.extend({
    type: z.literal("football_state"),
  }).strict(),
  FootballTeamTrustSetRequestedSchema.extend({
    type: z.literal("football_state"),
  }).strict(),
  FootballCoachTrustSetRequestedSchema.extend({
    type: z.literal("football_state"),
  }).strict(),
  FootballProfessionalReputationSetRequestedSchema.extend({
    type: z.literal("football_state"),
  }).strict(),
  FootballAmateurReputationSetRequestedSchema.extend({
    type: z.literal("football_state"),
  }).strict(),
  FootballSalarySetRequestedSchema.extend({
    type: z.literal("football_state"),
  }).strict(),
  FootballMarketValueSetRequestedSchema.extend({
    type: z.literal("football_state"),
  }).strict(),
  FootballIsInjuredSetRequestedSchema.extend({
    type: z.literal("football_state"),
  }).strict(),
  FootballCurrentInjuryIdSetRequestedSchema.extend({
    type: z.literal("football_state"),
  }).strict(),
  FootballRetirementStatusSetRequestedSchema.extend({
    type: z.literal("football_state"),
  }).strict(),
  FootballNumericAddRequestedSchema.extend({
    type: z.literal("football_state"),
  }).strict(),
  FootballOptionalIdClearRequestedSchema.extend({
    type: z.literal("football_state"),
  }).strict(),
]);

export const FlagEffectSchema = z
  .object({
    type: z.literal("flag"),
    key: HistoryKeySchema,
    value: z.union([z.boolean(), z.number().finite(), z.string()]),
  })
  .strict();

export const CounterEffectSchema = z.union([
  z
    .object({
      type: z.literal("counter"),
      key: HistoryKeySchema,
      operation: z.literal("set"),
      value: z.number().int().nonnegative(),
    })
    .strict(),
  z
    .object({
      type: z.literal("counter"),
      key: HistoryKeySchema,
      operation: z.literal("increment"),
      value: z.number().int(),
    })
    .strict(),
]);

export const RelationshipValueEffectSchema = z
  .object({
    type: z.literal("relationship_value"),
    selector: RelationshipSelectorSchema,
    field: z.enum(["affection", "trust", "conflict"]),
    operation: z.enum(["add", "set"]),
    value: z.number().finite(),
  })
  .strict();

export const RelationshipCreationDefinitionSchema = z
  .object({
    id: NonEmptyStringSchema,
    characterId: NonEmptyStringSchema,
    type: RelationshipTypeSchema,
    displayName: NonEmptyStringSchema,
    affection: ScaleSchema,
    trust: ScaleSchema,
    conflict: ScaleSchema,
    tags: z.array(NonEmptyStringSchema),
  })
  .strict();

export const CreateRelationshipEffectSchema = z
  .object({
    type: z.literal("create_relationship"),
    relationship: RelationshipCreationDefinitionSchema,
    conflictPolicy: z.enum(["error", "ignore"]),
  })
  .strict();

export const DeactivateRelationshipEffectSchema = z
  .object({
    type: z.literal("deactivate_relationship"),
    relationshipId: NonEmptyStringSchema,
  })
  .strict();

export const ScheduleEventEffectSchema = z
  .object({
    type: z.literal("schedule_event"),
    followUp: FollowUpDefinitionSchema,
  })
  .strict();

export const GameEffectSchema = z.union([
  PlayerStatEffectSchema,
  FootballAttributeEffectSchema,
  LifeStateEffectSchema,
  FootballStateEffectSchema,
  FlagEffectSchema,
  CounterEffectSchema,
  RelationshipValueEffectSchema,
  CreateRelationshipEffectSchema,
  DeactivateRelationshipEffectSchema,
  ScheduleEventEffectSchema,
]);

export const PlayerStatEffectRequestedSchema = PlayerStatEffectSchema.omit({
  type: true,
});
export const FootballAttributeEffectRequestedSchema =
  FootballAttributeEffectSchema.omit({ type: true });

export const FlagEffectRequestedSchema = FlagEffectSchema.omit({ type: true });

const counterRequestedVariants = [
  z
    .object({
      key: HistoryKeySchema,
      operation: z.literal("set"),
      value: z.number().int().nonnegative(),
    })
    .strict(),
  z
    .object({
      key: HistoryKeySchema,
      operation: z.literal("increment"),
      value: z.number().int(),
    })
    .strict(),
];
export const CounterEffectRequestedSchema = z.union(
  counterRequestedVariants as [
    (typeof counterRequestedVariants)[number],
    (typeof counterRequestedVariants)[number],
    ...(typeof counterRequestedVariants)[number][],
  ],
);

export const RelationshipValueEffectRequestedSchema =
  RelationshipValueEffectSchema.omit({ type: true });
export const CreateRelationshipEffectRequestedSchema =
  CreateRelationshipEffectSchema.omit({ type: true });
export const DeactivateRelationshipEffectRequestedSchema =
  DeactivateRelationshipEffectSchema.omit({ type: true });
export const ScheduleEventEffectRequestedSchema =
  ScheduleEventEffectSchema.omit({ type: true });
