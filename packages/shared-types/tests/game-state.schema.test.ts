import { describe, expect, it } from "vitest";
import { ZodError } from "zod";

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

function relationship(id: string, characterId = `character-${id}`) {
  return {
    id,
    characterId,
    type: "friend" as const,
    displayName: `Friend ${id}`,
    affection: 50,
    trust: 50,
    conflict: 0,
    isActive: true,
    isAlive: true,
    startedAtAge: 14,
    tags: [],
  };
}

function scheduledEvent(id: string) {
  return {
    id,
    eventId: `event_${id}`,
    sourceEventId: "source_event",
    priority: 0,
    createdAtTurn: 0,
    consumed: false,
    triggerType: "turn" as const,
    triggerValue: 1,
  };
}

function stateCollections(state: unknown): {
  relationships: ReturnType<typeof relationship>[];
  scheduledEvents: ReturnType<typeof scheduledEvent>[];
} {
  return state as {
    relationships: ReturnType<typeof relationship>[];
    scheduledEvents: ReturnType<typeof scheduledEvent>[];
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

  it.each([
    ["empty", []],
    ["one", [relationship("one")]],
    ["multiple unique", [relationship("one"), relationship("two")]],
  ])("accepts %s relationship IDs", (_case, relationships) => {
    const state = validState();
    stateCollections(state).relationships = relationships;
    expect(GameStateSchema.safeParse(state).success).toBe(true);
  });

  it("accepts distinct relationship IDs sharing a characterId", () => {
    const state = validState();
    stateCollections(state).relationships = [
      relationship("alex_friendship", "alex"),
      relationship("alex_teammate", "alex"),
    ];
    expect(GameStateSchema.safeParse(state).success).toBe(true);
  });

  it.each([
    ["twice", ["a", "a"], [["relationships", 1, "id"]]],
    [
      "three times",
      ["a", "a", "a"],
      [
        ["relationships", 1, "id"],
        ["relationships", 2, "id"],
      ],
    ],
    [
      "multiple groups",
      ["a", "b", "a", "a", "b"],
      [
        ["relationships", 2, "id"],
        ["relationships", 3, "id"],
        ["relationships", 4, "id"],
      ],
    ],
  ])("rejects relationship IDs duplicated %s", (_case, ids, paths) => {
    const state = validState();
    stateCollections(state).relationships = ids.map((id) => relationship(id));
    const result = GameStateSchema.safeParse(state);
    expect(result.success).toBe(false);
    if (result.success) throw new Error("Expected duplicate IDs to fail");
    expect(result.error.issues.map((issue) => issue.path)).toEqual(paths);
  });

  it.each([
    ["empty", []],
    ["one", [scheduledEvent("one")]],
    ["multiple unique", [scheduledEvent("one"), scheduledEvent("two")]],
  ])("accepts %s scheduled event IDs", (_case, scheduledEvents) => {
    const state = validState();
    stateCollections(state).scheduledEvents = scheduledEvents;
    expect(GameStateSchema.safeParse(state).success).toBe(true);
  });

  it.each([
    ["twice", ["a", "a"], [["scheduledEvents", 1, "id"]]],
    [
      "three times",
      ["a", "a", "a"],
      [
        ["scheduledEvents", 1, "id"],
        ["scheduledEvents", 2, "id"],
      ],
    ],
    [
      "multiple groups",
      ["a", "b", "a", "a", "b"],
      [
        ["scheduledEvents", 2, "id"],
        ["scheduledEvents", 3, "id"],
        ["scheduledEvents", 4, "id"],
      ],
    ],
  ])("rejects scheduled event IDs duplicated %s", (_case, ids, paths) => {
    const state = validState();
    stateCollections(state).scheduledEvents = ids.map((id) =>
      scheduledEvent(id),
    );
    const result = GameStateSchema.safeParse(state);
    expect(result.success).toBe(false);
    if (result.success) throw new Error("Expected duplicate IDs to fail");
    expect(result.error.issues.map((issue) => issue.path)).toEqual(paths);
  });

  it("keeps relationship and scheduled event ID namespaces separate", () => {
    const state = validState();
    stateCollections(state).relationships = [relationship("same_id")];
    stateCollections(state).scheduledEvents = [scheduledEvent("same_id")];
    expect(GameStateSchema.safeParse(state).success).toBe(true);
  });

  it("rejects GameState accessors without executing them", () => {
    const state = validState() as Record<string, unknown>;
    let getterCalls = 0;
    Object.defineProperty(state, "runId", {
      enumerable: true,
      get() {
        getterCalls += 1;
        throw new Error("boom");
      },
    });

    expect(() => GameStateSchema.safeParse(state)).not.toThrow();
    expect(GameStateSchema.safeParse(state).success).toBe(false);
    expect(getterCalls).toBe(0);
    expect(() => GameStateSchema.parse(state)).toThrow(ZodError);
    expect(getterCalls).toBe(0);
  });

  it.each(["symbol", "non-enumerable", "sparse array", "prototype"])(
    "rejects a GameState with an invalid persistibility %s",
    (invalidity) => {
      const state = validState() as Record<string, unknown>;
      if (invalidity === "symbol") {
        Object.defineProperty(state, Symbol("hidden"), {
          enumerable: true,
          value: true,
        });
      } else if (invalidity === "non-enumerable") {
        Object.defineProperty(state, "hidden", {
          enumerable: false,
          value: true,
        });
      } else if (invalidity === "sparse array") {
        state.relationships = new Array(2);
      } else {
        Object.setPrototypeOf(state, { custom: true });
      }
      expect(GameStateSchema.safeParse(state).success).toBe(false);
    },
  );

  it.each(["test", "a", "accepted_offer", "counter_2", "2_attempts"])(
    "accepts the history key %j in flags and counters",
    (key) => {
      const state = validState() as {
        history: {
          flags: Record<string, boolean>;
          counters: Record<string, number>;
        };
      };
      state.history.flags = { [key]: true };
      state.history.counters = { [key]: 0 };
      expect(GameStateSchema.safeParse(state).success).toBe(true);
    },
  );

  it.each([
    "",
    "   ",
    " exact ",
    "__proto__",
    "prototype",
    "constructor",
    "UPPERCASE",
    "with-dash",
    "with.dot",
    "double__underscore",
    "_leading",
    "trailing_",
  ])("rejects the history key %j in flags and counters", (key) => {
    const stateWithFlag = validState() as {
      history: {
        flags: Record<string, boolean>;
        counters: Record<string, number>;
      };
    };
    const stateWithCounter = validState() as {
      history: {
        flags: Record<string, boolean>;
        counters: Record<string, number>;
      };
    };
    stateWithFlag.history.flags = { [key]: true };
    stateWithCounter.history.counters = { [key]: 0 };
    expect(GameStateSchema.safeParse(stateWithFlag).success).toBe(false);
    expect(GameStateSchema.safeParse(stateWithCounter).success).toBe(false);
  });

  it.each([0, 1, Number.MAX_SAFE_INTEGER])(
    "accepts the persisted counter %s",
    (value) => {
      const state = validState() as {
        history: { counters: Record<string, number> };
      };
      state.history.counters.test = value;
      expect(GameStateSchema.safeParse(state).success).toBe(true);
    },
  );

  it.each([
    -1,
    1.5,
    Number.MAX_SAFE_INTEGER + 1,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ])("rejects the persisted counter %s", (value) => {
    const state = validState() as {
      history: { counters: Record<string, number> };
    };
    state.history.counters.test = value;
    expect(GameStateSchema.safeParse(state).success).toBe(false);
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

  it("accepts canonical JsonValue containers", () => {
    const nullPrototype = Object.assign(Object.create(null) as object, {
      value: "ok",
    });
    const nonEnumerableIndex = ["ok"];
    Object.defineProperty(nonEnumerableIndex, "0", {
      enumerable: false,
      value: "ok",
    });
    const shared = { value: "shared" };

    expect(JsonValueSchema.safeParse(nullPrototype).success).toBe(true);
    expect(JsonValueSchema.safeParse(nonEnumerableIndex).success).toBe(true);
    expect(
      JsonValueSchema.safeParse({ first: shared, second: shared }).success,
    ).toBe(true);
    expect(JsonValueSchema.safeParse(Object.freeze([1, 2])).success).toBe(true);
    expect(JsonValueSchema.safeParse(Object.seal([1, 2])).success).toBe(true);
    expect(JsonValueSchema.safeParse(-0).success).toBe(true);
  });

  it.each([
    ["small sparse array", new Array(3)],
    ["huge sparse array", new Array(4_000_000_000)],
    ["custom array property", Object.assign([1], { custom: true })],
    ["array Symbol key", Object.assign([1], { [Symbol("hidden")]: true })],
    ["object Symbol key", { value: "ok", [Symbol("hidden")]: true }],
    [
      "nested Symbol key with function",
      { nested: { [Symbol("hidden")]: () => true } },
    ],
    ["Symbol value", Symbol("value")],
    ["Date", new Date(0)],
    ["Map", new Map([["value", 1]])],
    [
      "class instance",
      new (class Data {
        value = 1;
      })(),
    ],
  ])("rejects the non-canonical JsonValue %s", (_name, value) => {
    expect(JsonValueSchema.safeParse(value).success).toBe(false);
  });

  it("rejects JsonValue accessors without executing them", () => {
    let getterCalls = 0;
    const getterValue = {};
    Object.defineProperty(getterValue, "value", {
      enumerable: true,
      get() {
        getterCalls += 1;
        return "ok";
      },
    });
    const setterValue = {};
    Object.defineProperty(setterValue, "value", {
      enumerable: true,
      set(value: unknown) {
        void value;
      },
    });
    const accessorArray: unknown[] = ["ok"];
    Object.defineProperty(accessorArray, "0", {
      enumerable: true,
      get() {
        getterCalls += 1;
        throw new Error("boom");
      },
    });

    expect(JsonValueSchema.safeParse(getterValue).success).toBe(false);
    expect(JsonValueSchema.safeParse(setterValue).success).toBe(false);
    expect(JsonValueSchema.safeParse(accessorArray).success).toBe(false);
    expect(getterCalls).toBe(0);
  });

  it("rejects hidden and cyclic JsonValue content", () => {
    const hidden = { visible: true };
    Object.defineProperty(hidden, "hidden", {
      enumerable: false,
      value: 1,
    });
    const arrayWithCustomHidden = [1];
    Object.defineProperty(arrayWithCustomHidden, "hidden", {
      enumerable: false,
      value: 1,
    });
    const first: Record<string, unknown> = {};
    const second: Record<string, unknown> = { first };
    first.second = second;

    expect(JsonValueSchema.safeParse(hidden).success).toBe(false);
    expect(JsonValueSchema.safeParse(arrayWithCustomHidden).success).toBe(
      false,
    );
    expect(JsonValueSchema.safeParse(first).success).toBe(false);
  });

  it("turns a revoked Proxy reflection failure into a failed safeParse", () => {
    const { proxy, revoke } = Proxy.revocable({}, {});
    revoke();

    expect(() => JsonValueSchema.safeParse(proxy)).not.toThrow();
    expect(JsonValueSchema.safeParse(proxy).success).toBe(false);
  });

  it("does not inspect a hostile prototype to discriminate reflection results", () => {
    let descriptorTrapCalls = 0;
    const hostilePrototype = new Proxy(
      {},
      {
        getOwnPropertyDescriptor() {
          descriptorTrapCalls += 1;
          throw new Error("prototype-descriptor-boom");
        },
      },
    );
    const value = new Proxy(
      {},
      {
        getPrototypeOf() {
          return hostilePrototype;
        },
      },
    );

    expect(() => JsonValueSchema.safeParse(value)).not.toThrow();
    expect(JsonValueSchema.safeParse(value).success).toBe(false);
    expect(descriptorTrapCalls).toBe(0);
    expect(() => JsonValueSchema.parse(value)).toThrow(ZodError);
    expect(descriptorTrapCalls).toBe(0);
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
