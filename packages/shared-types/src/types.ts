import type { z } from "zod";

import type {
  ChallengingTraitSchema,
  DominantFootSchema,
  EffectIntensitySchema,
  FootballPositionSchema,
  PlayerGenderSchema,
  PositiveTraitSchema,
} from "./schemas/common.schema.js";
import type { FootballAttributesSchema } from "./schemas/football-attributes.schema.js";
import type {
  CareerTypeSchema,
  FootballStateSchema,
  FootballStatusSchema,
  RetirementStatusSchema,
  TeamRoleSchema,
} from "./schemas/football.schema.js";
import type {
  GameRunStatusSchema,
  GameStateSchema,
} from "./schemas/game-state.schema.js";
import type {
  AppliedEffectSchema,
  DecisionRecordSchema,
  GameHistorySchema,
  HistoryFlagValueSchema,
} from "./schemas/history.schema.js";
import type {
  EducationStatusSchema,
  EmploymentStatusSchema,
  HousingStatusSchema,
  LifeStageSchema,
  LifeStateSchema,
  RelationshipStatusSchema,
} from "./schemas/life.schema.js";
import type { PlayerProfileSchema } from "./schemas/profile.schema.js";
import type {
  RelationshipSchema,
  RelationshipTypeSchema,
} from "./schemas/relationship.schema.js";
import type {
  EventConditionSchema,
  ScheduledEventSchema,
  ScheduledEventTriggerSchema,
} from "./schemas/scheduled-event.schema.js";
import type { PlayerStatsSchema } from "./schemas/stats.schema.js";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type PlayerGender = z.infer<typeof PlayerGenderSchema>;
export type DominantFoot = z.infer<typeof DominantFootSchema>;
export type FootballPosition = z.infer<typeof FootballPositionSchema>;
export type PositiveTrait = z.infer<typeof PositiveTraitSchema>;
export type ChallengingTrait = z.infer<typeof ChallengingTraitSchema>;
export type EffectIntensity = z.infer<typeof EffectIntensitySchema>;
export type PlayerProfile = z.infer<typeof PlayerProfileSchema>;
export type PlayerStats = z.infer<typeof PlayerStatsSchema>;
export type FootballAttributes = z.infer<typeof FootballAttributesSchema>;
export type LifeStage = z.infer<typeof LifeStageSchema>;
export type EducationStatus = z.infer<typeof EducationStatusSchema>;
export type EmploymentStatus = z.infer<typeof EmploymentStatusSchema>;
export type RelationshipStatus = z.infer<typeof RelationshipStatusSchema>;
export type HousingStatus = z.infer<typeof HousingStatusSchema>;
export type LifeState = z.infer<typeof LifeStateSchema>;
export type FootballStatus = z.infer<typeof FootballStatusSchema>;
export type CareerType = z.infer<typeof CareerTypeSchema>;
export type TeamRole = z.infer<typeof TeamRoleSchema>;
export type RetirementStatus = z.infer<typeof RetirementStatusSchema>;
export type FootballState = z.infer<typeof FootballStateSchema>;
export type RelationshipType = z.infer<typeof RelationshipTypeSchema>;
export type Relationship = z.infer<typeof RelationshipSchema>;
export type AppliedEffect = z.infer<typeof AppliedEffectSchema>;
export type DecisionRecord = z.infer<typeof DecisionRecordSchema>;
export type HistoryFlagValue = z.infer<typeof HistoryFlagValueSchema>;
export type GameHistory = z.infer<typeof GameHistorySchema>;
export type ScheduledEventTrigger = z.infer<typeof ScheduledEventTriggerSchema>;
export type EventCondition = z.infer<typeof EventConditionSchema>;
export type ScheduledEvent = z.infer<typeof ScheduledEventSchema>;
export type GameRunStatus = z.infer<typeof GameRunStatusSchema>;
export type GameState = z.infer<typeof GameStateSchema>;
