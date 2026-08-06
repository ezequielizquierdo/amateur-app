import type { z } from "zod";

import type {
  AppliedEffectSchema,
  AppliedEffectSourceSchema,
} from "./schemas/events/applied-effect.schema.js";
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
  EventChoiceSchema,
  ProbabilisticOutcomeSchema,
} from "./schemas/events/choices.schema.js";
import type {
  AllowedStateConditionFieldSchema,
  CounterConditionSchema,
  EventConditionGroupSchema,
  EventConditionSchema,
  EventHistoryConditionSchema,
  FlagConditionSchema,
  RelationshipConditionSchema,
  RelationshipExistsConditionSchema,
  RelationshipSelectorSchema,
  RelationshipValueConditionSchema,
  StateConditionSchema,
} from "./schemas/events/conditions.schema.js";
import type {
  CounterEffectSchema,
  CreateRelationshipEffectSchema,
  DeactivateRelationshipEffectSchema,
  FlagEffectSchema,
  FootballAttributeEffectSchema,
  FootballStateEffectSchema,
  GameEffectSchema,
  LifeStateEffectSchema,
  PlayerStatEffectSchema,
  RelationshipCreationDefinitionSchema,
  RelationshipValueEffectSchema,
  ScheduleEventEffectSchema,
} from "./schemas/events/effects.schema.js";
import type {
  ChoiceIdSchema,
  EventCategorySchema,
  EventIdSchema,
  EventNarrativeMetadataSchema,
  EventToneSchema,
  OutcomeIdSchema,
} from "./schemas/events/event-common.schema.js";
import type {
  EventRepeatPolicySchema,
  EventSelectionSchema,
  MandatoryEventSelectionSchema,
  WeightedEventSelectionSchema,
} from "./schemas/events/event-selection.schema.js";
import type {
  FollowUpDefinitionSchema,
  FollowUpTriggerSchema,
} from "./schemas/events/follow-up.schema.js";
import type {
  EventAvailabilitySchema,
  GameEventSchema,
} from "./schemas/events/game-event.schema.js";
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
export type EventId = z.infer<typeof EventIdSchema>;
export type ChoiceId = z.infer<typeof ChoiceIdSchema>;
export type OutcomeId = z.infer<typeof OutcomeIdSchema>;
export type EventCategory = z.infer<typeof EventCategorySchema>;
export type EventTone = z.infer<typeof EventToneSchema>;
export type EventNarrativeMetadata = z.infer<
  typeof EventNarrativeMetadataSchema
>;
export type AllowedStateConditionField = z.infer<
  typeof AllowedStateConditionFieldSchema
>;
export type StateCondition = z.infer<typeof StateConditionSchema>;
export type FlagCondition = z.infer<typeof FlagConditionSchema>;
export type CounterCondition = z.infer<typeof CounterConditionSchema>;
export type RelationshipSelector = z.infer<typeof RelationshipSelectorSchema>;
export type RelationshipExistsCondition = z.infer<
  typeof RelationshipExistsConditionSchema
>;
export type RelationshipValueCondition = z.infer<
  typeof RelationshipValueConditionSchema
>;
export type RelationshipCondition = z.infer<typeof RelationshipConditionSchema>;
export type EventHistoryCondition = z.infer<typeof EventHistoryConditionSchema>;
export type EventCondition = z.infer<typeof EventConditionSchema>;
export type EventConditionGroup = z.infer<typeof EventConditionGroupSchema>;
export type FollowUpTrigger = z.infer<typeof FollowUpTriggerSchema>;
export type FollowUpDefinition = z.infer<typeof FollowUpDefinitionSchema>;
export type PlayerStatEffect = z.infer<typeof PlayerStatEffectSchema>;
export type FootballAttributeEffect = z.infer<
  typeof FootballAttributeEffectSchema
>;
export type LifeStateEffect = z.infer<typeof LifeStateEffectSchema>;
export type FootballStateEffect = z.infer<typeof FootballStateEffectSchema>;
export type FlagEffect = z.infer<typeof FlagEffectSchema>;
export type CounterEffect = z.infer<typeof CounterEffectSchema>;
export type RelationshipValueEffect = z.infer<
  typeof RelationshipValueEffectSchema
>;
export type RelationshipCreationDefinition = z.infer<
  typeof RelationshipCreationDefinitionSchema
>;
export type CreateRelationshipEffect = z.infer<
  typeof CreateRelationshipEffectSchema
>;
export type DeactivateRelationshipEffect = z.infer<
  typeof DeactivateRelationshipEffectSchema
>;
export type ScheduleEventEffect = z.infer<typeof ScheduleEventEffectSchema>;
export type GameEffect = z.infer<typeof GameEffectSchema>;
export type AppliedEffectSource = z.infer<typeof AppliedEffectSourceSchema>;
export type AppliedEffect = z.infer<typeof AppliedEffectSchema>;
export type ProbabilisticOutcome = z.infer<typeof ProbabilisticOutcomeSchema>;
export type EventChoice = z.infer<typeof EventChoiceSchema>;
export type EventRepeatPolicy = z.infer<typeof EventRepeatPolicySchema>;
export type MandatoryEventSelection = z.infer<
  typeof MandatoryEventSelectionSchema
>;
export type WeightedEventSelection = z.infer<
  typeof WeightedEventSelectionSchema
>;
export type EventSelection = z.infer<typeof EventSelectionSchema>;
export type EventAvailability = z.infer<typeof EventAvailabilitySchema>;
export type GameEvent = z.infer<typeof GameEventSchema>;
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
export type DecisionRecord = z.infer<typeof DecisionRecordSchema>;
export type HistoryFlagValue = z.infer<typeof HistoryFlagValueSchema>;
export type GameHistory = z.infer<typeof GameHistorySchema>;
export type ScheduledEventTrigger = z.infer<typeof ScheduledEventTriggerSchema>;
export type ScheduledEvent = z.infer<typeof ScheduledEventSchema>;
export type GameRunStatus = z.infer<typeof GameRunStatusSchema>;
export type GameState = z.infer<typeof GameStateSchema>;
