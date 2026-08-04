import type {
  FootballAttributes,
  PlayerStats,
} from "@amateur-app/shared-types";

export const BASE_STATS = Object.freeze({
  mood: 70,
  energy: 75,
  health: 85,
  family: 65,
  friends: 65,
  finances: 45,
  footballLevel: 0,
} satisfies PlayerStats);

export const BASE_FOOTBALL_ATTRIBUTES = Object.freeze({
  talent: 55,
  technique: 42,
  physicalCondition: 60,
  tacticalUnderstanding: 32,
  discipline: 50,
  currentForm: 50,
  potential: 65,
  injuryRisk: 15,
} satisfies FootballAttributes);
