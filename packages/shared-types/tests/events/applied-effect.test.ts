import { describe, expect, expectTypeOf, it } from "vitest";
import { ZodError } from "zod";

import {
  AppliedEffectSchema,
  AppliedEffectSourceSchema,
  DecisionRecordSchema,
  GameStateSchema,
  type AppliedEffect,
} from "../../src/index.js";

type AppliedLifeState = Extract<AppliedEffect, { type: "life_state" }>;
type LifeRequested = AppliedLifeState["requested"];
type AppliedFootballState = Extract<AppliedEffect, { type: "football_state" }>;
type FootballRequested = AppliedFootballState["requested"];

const choiceSource = { phase: "choice" } as const;
const outcomeSource = { phase: "outcome", outcomeId: "accepted" } as const;

const relationship = {
  id: "relationship-1",
  characterId: "character_1",
  type: "friend",
  displayName: "Sam",
  affection: 50,
  trust: 60,
  conflict: 10,
  isActive: true,
  isAlive: true,
  startedAtAge: 14,
  tags: ["childhood_friend"],
} as const;

const inactiveRelationship = { ...relationship, isActive: false } as const;

function scheduledEvent(trigger: Record<string, unknown>) {
  return {
    id: "scheduled-1",
    eventId: "next_event",
    sourceEventId: "first_event",
    priority: 1,
    createdAtTurn: 0,
    consumed: false,
    ...trigger,
  };
}

function scalarEffect(
  type: string,
  requested: Record<string, unknown>,
  previous: boolean | number | string,
  resulting: boolean | number | string,
) {
  return {
    type,
    source: choiceSource,
    sourceEffectIndex: 0,
    status: "applied",
    requested,
    previous: { exists: true, value: previous },
    resulting: { exists: true, value: resulting },
  };
}

const validEffects = [
  scalarEffect(
    "player_stat",
    { field: "mood", operation: "add", value: 5 },
    50,
    55,
  ),
  scalarEffect(
    "football_attribute",
    { field: "technique", operation: "multiply", value: 1.1 },
    40,
    44,
  ),
  scalarEffect(
    "life_state",
    { field: "city", operation: "set", value: "Córdoba" },
    "Rosario",
    "Córdoba",
  ),
  scalarEffect(
    "football_state",
    { field: "status", operation: "set", value: "academy" },
    "without_team",
    "academy",
  ),
  scalarEffect("flag", { key: "accepted_offer", value: true }, false, true),
  scalarEffect(
    "counter",
    { key: "attempts", operation: "increment", value: 1 },
    0,
    1,
  ),
  {
    type: "relationship_value",
    source: choiceSource,
    sourceEffectIndex: 6,
    status: "applied",
    requested: {
      selector: { type: "friend" },
      field: "trust",
      operation: "add",
      value: 5,
    },
    relationshipId: "relationship-1",
    previous: { exists: true, value: 60 },
    resulting: { exists: true, value: 65 },
  },
  {
    type: "create_relationship",
    source: choiceSource,
    sourceEffectIndex: 7,
    status: "applied",
    requested: {
      relationship: {
        id: relationship.id,
        characterId: relationship.characterId,
        type: relationship.type,
        displayName: relationship.displayName,
        affection: relationship.affection,
        trust: relationship.trust,
        conflict: relationship.conflict,
        tags: [...relationship.tags],
      },
      conflictPolicy: "error",
    },
    previous: { exists: false },
    resulting: { exists: true, value: relationship },
  },
  {
    type: "deactivate_relationship",
    source: choiceSource,
    sourceEffectIndex: 8,
    status: "applied",
    requested: { relationshipId: relationship.id },
    previous: { exists: true, value: relationship },
    resulting: { exists: true, value: inactiveRelationship },
  },
  {
    type: "schedule_event",
    source: outcomeSource,
    sourceEffectIndex: 0,
    status: "applied",
    requested: {
      followUp: {
        eventId: "next_event",
        trigger: { type: "turn", afterTurns: 2 },
        priority: 1,
      },
    },
    previous: { exists: false },
    resulting: {
      exists: true,
      value: scheduledEvent({ triggerType: "turn", triggerValue: 2 }),
    },
  },
];

function decision(immediateEffects: unknown[] = validEffects) {
  return {
    eventId: "first_event",
    eventVersion: 1,
    choiceId: "first_choice",
    outcomeId: "accepted",
    age: 14,
    season: 1,
    turn: 0,
    immediateEffects,
  };
}

function validState() {
  return {
    runId: "run-1",
    gameVersion: "0.4.0",
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
      decisions: [decision()],
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

describe("AppliedEffectSourceSchema", () => {
  it.each([choiceSource, outcomeSource])("accepts a valid source", (source) => {
    expect(AppliedEffectSourceSchema.safeParse(source).success).toBe(true);
  });

  it.each([
    { phase: "choice", outcomeId: "accepted" },
    { phase: "outcome" },
    { phase: "outcome", outcomeId: "Invalid ID" },
    { phase: "choice", extra: true },
  ])("rejects an invalid source", (source) => {
    expect(AppliedEffectSourceSchema.safeParse(source).success).toBe(false);
  });
});

describe("AppliedEffect requested payloads", () => {
  it("preserves exact requested correlations at compile time", () => {
    expectTypeOf({
      field: "numberOfChildren" as const,
      operation: "set" as const,
      value: 1,
    }).toMatchTypeOf<LifeRequested>();
    expectTypeOf({
      field: "occupationId" as const,
      operation: "clear" as const,
    }).toMatchTypeOf<LifeRequested>();
    expectTypeOf({
      field: "salary" as const,
      operation: "set" as const,
      value: 100,
    }).toMatchTypeOf<FootballRequested>();
    expectTypeOf({
      field: "isInjured" as const,
      operation: "set" as const,
      value: true,
    }).toMatchTypeOf<FootballRequested>();
    expectTypeOf({
      field: "currentContractId" as const,
      operation: "clear" as const,
    }).toMatchTypeOf<FootballRequested>();

    expectTypeOf({
      field: "numberOfChildren" as const,
      operation: "set" as const,
      value: "invalid",
    }).not.toMatchTypeOf<LifeRequested>();
    expectTypeOf({
      field: "educationStatus" as const,
      operation: "set" as const,
      value: 1,
    }).not.toMatchTypeOf<LifeRequested>();
    expectTypeOf({
      field: "salary" as const,
      operation: "set" as const,
      value: "invalid",
    }).not.toMatchTypeOf<FootballRequested>();
    expectTypeOf({
      field: "isInjured" as const,
      operation: "set" as const,
      value: 1,
    }).not.toMatchTypeOf<FootballRequested>();
    expectTypeOf({
      field: "teamTrust" as const,
      operation: "set" as const,
      value: "invalid",
    }).not.toMatchTypeOf<FootballRequested>();

    const invalidLifeClear: LifeRequested = {
      field: "occupationId",
      operation: "clear",
      // @ts-expect-error clear payloads do not contain value
      value: "unexpected",
    };
    const invalidFootballClear: FootballRequested = {
      field: "currentContractId",
      operation: "clear",
      // @ts-expect-error clear payloads do not contain value
      value: "unexpected",
    };
    expect(invalidLifeClear).toBeDefined();
    expect(invalidFootballClear).toBeDefined();
  });

  it.each(validEffects)("accepts the $type family", (effect) => {
    expect(AppliedEffectSchema.safeParse(effect).success).toBe(true);
  });

  it.each([
    { sourceEffectIndex: -1 },
    { sourceEffectIndex: 0.5 },
    { sourceEffectIndex: undefined },
  ])("rejects an invalid source effect index", (replacement) => {
    expect(
      AppliedEffectSchema.safeParse({ ...validEffects[0], ...replacement })
        .success,
    ).toBe(false);
  });

  it("accepts zero and positive source effect indexes", () => {
    expect(AppliedEffectSchema.safeParse(validEffects[0]).success).toBe(true);
    expect(
      AppliedEffectSchema.safeParse({
        ...validEffects[0],
        sourceEffectIndex: 12,
      }).success,
    ).toBe(true);
  });

  it("rejects a structurally absent source effect index", () => {
    const { sourceEffectIndex: _removed, ...withoutIndex } = validEffects[0]!;
    expect(_removed).toBe(0);
    expect(AppliedEffectSchema.safeParse(withoutIndex).success).toBe(false);
  });

  it.each([
    { type: "player_stat" },
    { extra: true },
    { field: "footballLevel", operation: "add", value: 1 },
    { field: "mood", operation: "clear" },
  ])("rejects an invalid requested payload", (requested) => {
    expect(
      AppliedEffectSchema.safeParse({ ...validEffects[0], requested }).success,
    ).toBe(false);
  });

  it.each([
    {
      type: "life_state",
      requested: { field: "numberOfChildren", operation: "add", value: 1 },
    },
    {
      type: "life_state",
      requested: { field: "employerId", operation: "clear" },
    },
    {
      type: "football_state",
      requested: { field: "salary", operation: "add", value: 5 },
    },
    {
      type: "football_state",
      requested: { field: "currentTeamId", operation: "clear" },
    },
  ])("preserves the internal $type discrimination", ({ type, requested }) => {
    expect(
      AppliedEffectSchema.safeParse({
        ...validEffects[type === "life_state" ? 2 : 3],
        requested,
      }).success,
    ).toBe(true);
  });

  it.each([
    {
      type: "life_state",
      requested: { field: "city", operation: "add", value: 1 },
    },
    {
      type: "football_state",
      requested: { field: "status", operation: "add", value: 1 },
    },
  ])("rejects a collapsed $type combination", ({ type, requested }) => {
    expect(
      AppliedEffectSchema.safeParse({
        ...validEffects[type === "life_state" ? 2 : 3],
        requested,
      }).success,
    ).toBe(false);
  });

  it.each([
    { operation: "set", value: 0, expected: true },
    { operation: "set", value: -1, expected: false },
    { operation: "set", value: 0.5, expected: false },
    { operation: "increment", value: -1, expected: true },
    { operation: "increment", value: 0, expected: true },
    { operation: "increment", value: 1, expected: true },
  ])(
    "validates counter requested $operation $value",
    ({ operation, value, expected }) => {
      expect(
        AppliedEffectSchema.safeParse({
          ...validEffects[5],
          requested: { key: "attempts", operation, value },
        }).success,
      ).toBe(expected);
    },
  );

  it.each(["", "__proto__", "prototype", "constructor", "with-dash"])(
    "rejects the history key %j in persisted requested payloads",
    (key) => {
      expect(
        AppliedEffectSchema.safeParse({
          ...validEffects[4],
          requested: { key, value: true },
        }).success,
      ).toBe(false);
      expect(
        AppliedEffectSchema.safeParse({
          ...validEffects[5],
          requested: { key, operation: "set", value: 0 },
        }).success,
      ).toBe(false);
    },
  );

  it("uses safe integers in persisted counter requests", () => {
    for (const operation of ["set", "increment"] as const) {
      expect(
        AppliedEffectSchema.safeParse({
          ...validEffects[5],
          requested: {
            key: "attempts",
            operation,
            value: Number.MAX_SAFE_INTEGER,
          },
        }).success,
      ).toBe(true);
      expect(
        AppliedEffectSchema.safeParse({
          ...validEffects[5],
          requested: {
            key: "attempts",
            operation,
            value: Number.MAX_SAFE_INTEGER + 1,
          },
        }).success,
      ).toBe(false);
    }
  });
});

describe("AppliedEffect snapshots and statuses", () => {
  it.each([
    { exists: false },
    { exists: true, value: false },
    { exists: true, value: 10 },
    { exists: true, value: "value" },
  ])("accepts a scalar snapshot", (previous) => {
    expect(
      AppliedEffectSchema.safeParse({ ...validEffects[0], previous }).success,
    ).toBe(true);
  });

  it.each([
    { exists: true, value: {} },
    { exists: true, value: [] },
    { exists: false, value: 1 },
    { exists: true },
  ])("rejects an invalid scalar snapshot", (previous) => {
    expect(
      AppliedEffectSchema.safeParse({ ...validEffects[0], previous }).success,
    ).toBe(false);
  });

  const appliedAndNoChangeFamilies = validEffects.slice(0, 7);

  it.each(appliedAndNoChangeFamilies)("accepts applied for $type", (effect) => {
    expect(
      AppliedEffectSchema.safeParse({ ...effect, status: "applied" }).success,
    ).toBe(true);
  });

  it.each(appliedAndNoChangeFamilies)(
    "accepts no_change for $type",
    (effect) => {
      expect(
        AppliedEffectSchema.safeParse({ ...effect, status: "no_change" })
          .success,
      ).toBe(true);
    },
  );

  it.each(appliedAndNoChangeFamilies)("rejects ignored for $type", (effect) => {
    expect(
      AppliedEffectSchema.safeParse({ ...effect, status: "ignored" }).success,
    ).toBe(false);
  });
});

describe("relationship applied effects", () => {
  const appliedCreate = validEffects[7] as Record<string, unknown>;
  const ignoredCreate = {
    ...appliedCreate,
    status: "ignored",
    requested: {
      ...(appliedCreate.requested as Record<string, unknown>),
      conflictPolicy: "ignore",
    },
    previous: { exists: true, value: relationship },
    resulting: { exists: true, value: relationship },
  };

  it("accepts applied and ignored creation forms", () => {
    expect(AppliedEffectSchema.safeParse(appliedCreate).success).toBe(true);
    expect(AppliedEffectSchema.safeParse(ignoredCreate).success).toBe(true);
  });

  it.each([
    { ...ignoredCreate, requested: appliedCreate.requested },
    { ...appliedCreate, status: "no_change" },
    { ...appliedCreate, previous: { exists: true, value: relationship } },
    { ...ignoredCreate, previous: { exists: false } },
    { ...appliedCreate, resulting: { exists: false } },
  ])("rejects an invalid creation form", (effect) => {
    expect(AppliedEffectSchema.safeParse(effect).success).toBe(false);
  });

  it("accepts a non-empty relationshipId", () => {
    expect(AppliedEffectSchema.safeParse(validEffects[6]).success).toBe(true);
  });

  it("rejects an absent relationshipId", () => {
    const effect = validEffects[6] as Record<string, unknown>;
    const { relationshipId: _removed, ...withoutRelationshipId } = effect;
    expect(_removed).toBe("relationship-1");
    expect(AppliedEffectSchema.safeParse(withoutRelationshipId).success).toBe(
      false,
    );
  });

  it("rejects an empty relationshipId", () => {
    expect(
      AppliedEffectSchema.safeParse({
        ...validEffects[6],
        relationshipId: "",
      }).success,
    ).toBe(false);
  });

  it("requires numeric present relationship snapshots", () => {
    const effect = validEffects[6] as Record<string, unknown>;
    for (const invalid of [
      { ...effect, previous: { exists: false } },
      { ...effect, previous: { exists: true, value: true } },
      { ...effect, resulting: { exists: true, value: "65" } },
      { ...effect, resulting: { exists: true, value: {} } },
    ]) {
      expect(AppliedEffectSchema.safeParse(invalid).success).toBe(false);
    }
  });

  it("allows repeated relationship source indexes in a decision", () => {
    const first = validEffects[6];
    const second = { ...first, relationshipId: "relationship-2" };
    expect(
      DecisionRecordSchema.safeParse(decision([first, second])).success,
    ).toBe(true);
  });

  it("requires complete present deactivation snapshots ending inactive", () => {
    const effect = validEffects[8] as Record<string, unknown>;
    expect(AppliedEffectSchema.safeParse(effect).success).toBe(true);
    expect(
      AppliedEffectSchema.safeParse({ ...effect, status: "no_change" }).success,
    ).toBe(true);
    expect(
      AppliedEffectSchema.safeParse({ ...effect, status: "ignored" }).success,
    ).toBe(false);
    expect(
      AppliedEffectSchema.safeParse({
        ...effect,
        resulting: { exists: true, value: relationship },
      }).success,
    ).toBe(false);
    expect(
      AppliedEffectSchema.safeParse({
        ...effect,
        previous: { exists: false },
      }).success,
    ).toBe(false);
  });
});

describe("scheduled applied effects", () => {
  it.each([
    { triggerType: "turn", triggerValue: 2 },
    { triggerType: "age", triggerValue: 18 },
    { triggerType: "season", triggerValue: 2 },
    {
      triggerType: "condition",
      conditions: {
        mode: "all",
        conditions: [
          { type: "flag", key: "ready", operator: "equals", value: true },
        ],
      },
    },
  ])("accepts a $triggerType scheduled result", (trigger) => {
    const effect = validEffects[9] as Record<string, unknown>;
    expect(
      AppliedEffectSchema.safeParse({
        ...effect,
        resulting: { exists: true, value: scheduledEvent(trigger) },
      }).success,
    ).toBe(true);
  });

  it.each([
    { status: "no_change" },
    { status: "ignored" },
    {
      previous: {
        exists: true,
        value: scheduledEvent({ triggerType: "turn", triggerValue: 1 }),
      },
    },
    { resulting: { exists: false } },
    { extra: true },
  ])("rejects an invalid scheduled form", (replacement) => {
    expect(
      AppliedEffectSchema.safeParse({ ...validEffects[9], ...replacement })
        .success,
    ).toBe(false);
  });
});

describe("AppliedEffect persistibility", () => {
  it("returns failed safeParse results and ZodError for explicit undefined", () => {
    const effect = { ...validEffects[0], extra: undefined };
    expect(() => AppliedEffectSchema.safeParse(effect)).not.toThrow();
    expect(AppliedEffectSchema.safeParse(effect).success).toBe(false);
    expect(() => AppliedEffectSchema.parse(effect)).toThrow(ZodError);
  });

  it("reports a useful path for nested undefined", () => {
    const effect = structuredClone(validEffects[0]) as {
      requested: Record<string, unknown>;
    };
    effect.requested.field = undefined;
    const result = AppliedEffectSchema.safeParse(effect);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["requested", "field"]);
    }
  });

  it("rejects circular references without throwing from safeParse", () => {
    const effect = structuredClone(validEffects[0]) as Record<string, unknown>;
    effect.circular = effect;
    expect(() => AppliedEffectSchema.safeParse(effect)).not.toThrow();
    expect(AppliedEffectSchema.safeParse(effect).success).toBe(false);
    expect(() => AppliedEffectSchema.parse(effect)).toThrow(ZodError);
  });

  it.each([
    new Date(0),
    () => true,
    BigInt(1),
    Number.NaN,
    Number.POSITIVE_INFINITY,
  ])("rejects a non-persistible scalar", (value) => {
    expect(
      AppliedEffectSchema.safeParse({
        ...validEffects[0],
        resulting: { exists: true, value },
      }).success,
    ).toBe(false);
  });

  it("accepts a shared non-circular reference", () => {
    const shared = relationship;
    const effect = {
      ...(validEffects[7] as Record<string, unknown>),
      status: "ignored",
      requested: {
        ...((validEffects[7] as Record<string, unknown>).requested as Record<
          string,
          unknown
        >),
        conflictPolicy: "ignore",
      },
      previous: { exists: true, value: shared },
      resulting: { exists: true, value: shared },
    };
    expect(AppliedEffectSchema.safeParse(effect).success).toBe(true);
  });

  it("does not mutate its input", () => {
    const effect = structuredClone(validEffects[0]);
    const snapshot = structuredClone(effect);
    AppliedEffectSchema.safeParse(effect);
    expect(effect).toEqual(snapshot);
  });
});

describe("DecisionRecord and GameState persistence", () => {
  it("accepts all ten families in a complete decision", () => {
    expect(DecisionRecordSchema.safeParse(decision()).success).toBe(true);
  });

  it("rejects the former AppliedEffect shape", () => {
    expect(
      DecisionRecordSchema.safeParse(
        decision([
          {
            field: "stats.mood",
            operation: "add",
            appliedValue: 5,
          },
        ]),
      ).success,
    ).toBe(false);
  });

  it("accepts empty immediate effects and an initial-style empty history", () => {
    expect(DecisionRecordSchema.safeParse(decision([])).success).toBe(true);
    const state = validState();
    state.history.decisions = [];
    expect(GameStateSchema.safeParse(state).success).toBe(true);
  });

  it("round-trips a GameState containing all ten families through JSON", () => {
    const state = validState();
    const parsed = GameStateSchema.parse(JSON.parse(JSON.stringify(state)));
    expect(parsed).toEqual(state);
  });
});
