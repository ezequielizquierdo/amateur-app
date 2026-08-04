import { describe, expect, it } from "vitest";

import {
  FootballStateSchema,
  GameStateSchema,
  JsonValueSchema,
  NonEmptyStringSchema,
  PlayerProfileSchema,
  ScaleSchema,
  ScheduledEventSchema,
} from "../src/index.js";

function validState(): unknown {
  return {
    runId: "run-1",
    gameVersion: "0.1.0",
    seed: "seed-1",
    profile: {
      id: "profile-1",
      name: "Alex",
      gender: "woman",
      birthCountry: "Argentina",
      preferredPosition: "midfielder",
      dominantFoot: "right",
      startingAge: 14,
      positiveTrait: "disciplined",
      challengingTrait: "insecure",
    },
    stats: {
      mood: 60,
      energy: 75,
      health: 85,
      family: 65,
      friends: 65,
      finances: 45,
      footballLevel: 47,
    },
    footballAttributes: {
      talent: 55,
      technique: 42,
      physicalCondition: 60,
      tacticalUnderstanding: 32,
      discipline: 65,
      currentForm: 50,
      potential: 65,
      injuryRisk: 15,
    },
    life: {
      age: 14,
      currentYear: 2026,
      lifeStage: "adolescence",
      educationStatus: "secondary_school",
      employmentStatus: "not_working",
      relationshipStatus: "single",
      city: "Rosario",
      country: "Argentina",
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
    relationships: [],
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
  };
}

describe("shared structural schemas", () => {
  it.each([0, 100])("accepts the exact scale boundary %s", (value) => {
    expect(ScaleSchema.parse(value)).toBe(value);
  });

  it.each(["", "   "])("rejects an empty string: %j", (value) => {
    expect(NonEmptyStringSchema.safeParse(value).success).toBe(false);
  });

  it("preserves leading and trailing spaces in a valid string", () => {
    expect(NonEmptyStringSchema.parse(" run-1 ")).toBe(" run-1 ");
  });

  it("accepts a structurally valid game state", () => {
    expect(GameStateSchema.safeParse(validState()).success).toBe(true);
  });

  it("rejects an empty player name", () => {
    const state = validState() as { profile: { name: string } };
    state.profile.name = " ";
    expect(GameStateSchema.safeParse(state).success).toBe(false);
  });

  it("requires startingAge to be exactly 14", () => {
    const profile = (validState() as { profile: Record<string, unknown> })
      .profile;
    profile.startingAge = 15;
    expect(PlayerProfileSchema.safeParse(profile).success).toBe(false);
  });

  it("rejects scale values outside 0-100", () => {
    const state = validState() as { stats: { mood: number } };
    state.stats.mood = 101;
    expect(GameStateSchema.safeParse(state).success).toBe(false);
  });

  it("rejects fractional ages", () => {
    const state = validState() as { life: { age: number } };
    state.life.age = 14.5;
    expect(GameStateSchema.safeParse(state).success).toBe(false);
  });

  it("rejects a fractional current year", () => {
    const state = validState() as { life: { currentYear: number } };
    state.life.currentYear = 2026.5;
    expect(GameStateSchema.safeParse(state).success).toBe(false);
  });

  it("rejects an age below startingAge", () => {
    const state = validState() as { life: { age: number } };
    state.life.age = 13;
    expect(GameStateSchema.safeParse(state).success).toBe(false);
  });

  it("rejects negative children", () => {
    const state = validState() as { life: { numberOfChildren: number } };
    state.life.numberOfChildren = -1;
    expect(GameStateSchema.safeParse(state).success).toBe(false);
  });

  it("rejects negative match counts", () => {
    const state = validState() as { football: { careerMatches: number } };
    state.football.careerMatches = -1;
    expect(GameStateSchema.safeParse(state).success).toBe(false);
  });

  it.each([0, 12.5])("allows the non-negative economic value %s", (value) => {
    const state = validState() as {
      football: { salary: number; marketValue: number };
    };
    state.football.salary = value;
    state.football.marketValue = value;
    expect(GameStateSchema.safeParse(state).success).toBe(true);
  });

  it("rejects negative economic values", () => {
    const state = validState() as { football: { salary: number } };
    state.football.salary = -0.01;
    expect(GameStateSchema.safeParse(state).success).toBe(false);
  });

  it("rejects fractional children counts", () => {
    const state = validState() as { life: { numberOfChildren: number } };
    state.life.numberOfChildren = 1.5;
    expect(GameStateSchema.safeParse(state).success).toBe(false);
  });

  it("rejects fractional sports statistics", () => {
    const state = validState() as { football: { seasonGoals: number } };
    state.football.seasonGoals = 1.5;
    expect(GameStateSchema.safeParse(state).success).toBe(false);
  });

  it("validates priority and createdAtTurn as integers", () => {
    const scheduledEvent = {
      id: "scheduled-1",
      eventId: "event-1",
      triggerType: "turn",
      sourceEventId: "source-1",
      priority: 1.5,
      createdAtTurn: -1,
      consumed: false,
    };
    expect(ScheduledEventSchema.safeParse(scheduledEvent).success).toBe(false);
  });

  it("requires an injury id for an active injury", () => {
    const football = (validState() as { football: Record<string, unknown> })
      .football;
    football.isInjured = true;
    expect(FootballStateSchema.safeParse(football).success).toBe(false);
  });

  it("forbids an injury id without an active injury", () => {
    const football = (validState() as { football: Record<string, unknown> })
      .football;
    football.currentInjuryId = "injury-1";
    expect(FootballStateSchema.safeParse(football).success).toBe(false);
  });

  it("requires retired football status for permanent retirement", () => {
    const football = (validState() as { football: Record<string, unknown> })
      .football;
    football.retirementStatus = "permanently_retired";
    expect(FootballStateSchema.safeParse(football).success).toBe(false);
  });

  it("requires endingId for a finished game", () => {
    const state = validState() as Record<string, unknown>;
    state.status = "finished";
    expect(GameStateSchema.safeParse(state).success).toBe(false);
  });

  it("forbids endingId for an active game", () => {
    const state = validState() as Record<string, unknown>;
    state.endingId = "ending-1";
    expect(GameStateSchema.safeParse(state).success).toBe(false);
  });

  it("rejects season zero and a negative turn", () => {
    const state = validState() as {
      currentSeason: number;
      currentTurn: number;
    };
    state.currentSeason = 0;
    state.currentTurn = -1;
    expect(GameStateSchema.safeParse(state).success).toBe(false);
  });

  it("accepts nested JsonValue data", () => {
    const value = { text: "ok", items: [1, true, null, { nested: "yes" }] };
    expect(JsonValueSchema.parse(value)).toEqual(value);
  });

  it.each([
    undefined,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    BigInt(1),
    () => true,
    new Date(0),
  ])("rejects a non-serializable value: %s", (value) => {
    expect(JsonValueSchema.safeParse(value).success).toBe(false);
  });
});
