import type {
  ChallengingTrait,
  DominantFoot,
  FootballPosition,
  GameState,
  PlayerGender,
  PositiveTrait,
  Relationship,
} from "@amateur-app/shared-types";

import { calculateFootballLevel } from "../calculations/calculate-football-level.js";
import { validateGameState } from "../validation/validate-game-state.js";
import { applyInitialTraits } from "./apply-initial-traits.js";
import { BASE_FOOTBALL_ATTRIBUTES, BASE_STATS } from "./base-values.js";

export const GAME_VERSION = "0.3.0" as const;

export type CreateInitialGameStateInput = {
  runId: string;
  profileId: string;
  seed: string;
  name: string;
  gender: PlayerGender;
  birthCountry: string;
  birthCity?: string;
  preferredPosition: FootballPosition;
  dominantFoot: DominantFoot;
  positiveTrait: PositiveTrait;
  challengingTrait: ChallengingTrait;
  currentYear: number;
  city: string;
  country: string;
  initialRelationships?: Relationship[];
};

function cloneRelationships(
  relationships: readonly Relationship[],
): Relationship[] {
  return relationships.map((relationship) => ({
    ...relationship,
    tags: [...relationship.tags],
  }));
}

export function createInitialGameState(
  input: CreateInitialGameStateInput,
): GameState {
  const initial = applyInitialTraits(
    { ...BASE_STATS },
    { ...BASE_FOOTBALL_ATTRIBUTES },
    input.positiveTrait,
    input.challengingTrait,
  );
  const footballLevel = calculateFootballLevel(initial.footballAttributes);

  const profile: GameState["profile"] = {
    id: input.profileId,
    name: input.name,
    gender: input.gender,
    birthCountry: input.birthCountry,
    preferredPosition: input.preferredPosition,
    dominantFoot: input.dominantFoot,
    startingAge: 14,
    positiveTrait: input.positiveTrait,
    challengingTrait: input.challengingTrait,
    ...(input.birthCity === undefined ? {} : { birthCity: input.birthCity }),
  };

  return validateGameState({
    runId: input.runId,
    gameVersion: GAME_VERSION,
    seed: input.seed,
    profile,
    stats: { ...initial.stats, footballLevel },
    footballAttributes: { ...initial.footballAttributes },
    life: {
      age: 14,
      currentYear: input.currentYear,
      lifeStage: "adolescence",
      educationStatus: "secondary_school",
      employmentStatus: "not_working",
      relationshipStatus: "single",
      city: input.city,
      country: input.country,
      numberOfChildren: 0,
      petIds: [],
      housingStatus: "family_home",
    },
    football: {
      status: "without_team",
      careerType: "undecided",
      teamRole: "prospect",
      teamTrust: 0,
      coachTrust: 0,
      professionalReputation: 0,
      amateurReputation: 0,
      salary: 0,
      marketValue: 0,
      seasonMatches: 0,
      seasonGoals: 0,
      seasonAssists: 0,
      careerMatches: 0,
      careerGoals: 0,
      careerAssists: 0,
      isInjured: false,
      retirementStatus: "not_retired",
    },
    relationships: cloneRelationships(input.initialRelationships ?? []),
    history: {
      decisions: [],
      flags: {},
      counters: {},
      completedEventIds: [],
      recentEventIds: [],
      formerTeamIds: [],
      formerClubIds: [],
    },
    scheduledEvents: [],
    currentSeason: 1,
    currentTurn: 0,
    status: "active",
  });
}
