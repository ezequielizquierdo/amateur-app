import {
  type GameEffect,
  type GameState,
  type Relationship,
} from "@amateur-app/shared-types";
import { describe, expect, it } from "vitest";

import { InternalEffectApplicationError } from "../src/events/effects/internal-effect-application-error.js";
import {
  calculateFootballLevel,
  createInitialGameState,
  EventEffectResolutionError,
  resolveGameEffects,
  type EffectResolutionContext,
} from "../src/index.js";
import { createInput, createRelationship } from "./test-fixtures.js";

const choiceContext: EffectResolutionContext = {
  sourceEventId: "source_event",
  sourceEventVersion: 1,
  choiceId: "choice_one",
  source: { phase: "choice" },
};

function createState(relationships: Relationship[] = []): GameState {
  return createInitialGameState(
    createInput({ initialRelationships: relationships }),
  );
}

function resolve(
  effects: readonly GameEffect[],
  state = createState(),
  context: EffectResolutionContext = choiceContext,
) {
  return resolveGameEffects(effects, state, context);
}

function resolveRuntime(
  effects: unknown,
  state: unknown,
  context: unknown,
): unknown {
  const result: unknown = Reflect.apply(resolveGameEffects, undefined, [
    effects,
    state,
    context,
  ]);
  return result;
}

function captureError(action: () => unknown): unknown {
  try {
    action();
  } catch (error) {
    return error;
  }
  throw new Error("Expected action to throw");
}

function expectResolutionError(
  error: unknown,
  code: EventEffectResolutionError["code"],
  expected?: { effectIndex: number; effectType: GameEffect["type"] },
): EventEffectResolutionError {
  expect(error).toBeInstanceOf(EventEffectResolutionError);
  expect(error).toMatchObject({ code });
  if (!(error instanceof EventEffectResolutionError)) {
    throw new Error("Expected EventEffectResolutionError");
  }
  if (expected === undefined) {
    expect(error).not.toHaveProperty("effectIndex");
    expect(error).not.toHaveProperty("effectType");
  } else {
    expect(error.effectIndex).toBe(expected.effectIndex);
    expect(error.effectType).toBe(expected.effectType);
  }
  expect(error).toHaveProperty("cause");
  return error;
}

function creationEffect(
  id = "relationship_new",
): Extract<GameEffect, { type: "create_relationship" }> {
  return {
    type: "create_relationship",
    relationship: {
      id,
      characterId: "character_new",
      type: "friend",
      displayName: "New Friend",
      affection: 50,
      trust: 40,
      conflict: 5,
      tags: ["new_friend"],
    },
    conflictPolicy: "error",
  };
}

function scheduleEffect(
  trigger: Extract<
    GameEffect,
    { type: "schedule_event" }
  >["followUp"]["trigger"] = {
    type: "turn",
    afterTurns: 1,
  },
): Extract<GameEffect, { type: "schedule_event" }> {
  return {
    type: "schedule_event",
    followUp: { eventId: "future_event", trigger, priority: 5 },
  };
}

describe("resolveGameEffects public API", () => {
  it("exports the resolver and a usable public error", () => {
    expect(resolveGameEffects).toBeTypeOf("function");
    const error = new EventEffectResolutionError("INVALID_INPUT", "invalid");
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(EventEffectResolutionError);
    expect(error.name).toBe("EventEffectResolutionError");
    expect(error.code).toBe("INVALID_INPUT");
    expect(error).not.toHaveProperty("effectIndex");
    expect(error).not.toHaveProperty("effectType");
  });

  it("resolves an empty array to an independent equivalent state", () => {
    const state = createState();
    state.history.decisions.push({
      eventId: "prior_event",
      eventVersion: 1,
      choiceId: "prior_choice",
      age: 14,
      season: 1,
      turn: 0,
      immediateEffects: [],
    });
    const before = structuredClone(state);
    const result = resolve([], state);

    expect(result.appliedEffects).toEqual([]);
    expect(result.nextState).toEqual(before);
    expect(result.nextState).not.toBe(state);
    expect(result.nextState.history).not.toBe(state.history);
    expect(result.nextState.history.decisions).toEqual(
      before.history.decisions,
    );
    expect(state).toEqual(before);
  });
});

describe("input validation", () => {
  it("rejects an invalid initial state", () => {
    const state = createState();
    state.stats.mood = 101;
    const before = structuredClone(state);
    const error = captureError(() => resolve([], state));
    expectResolutionError(error, "INVALID_INPUT");
    expect(state).toEqual(before);
  });

  it("rejects stale footballLevel instead of repairing it", () => {
    const state = createState();
    state.stats.footballLevel += 1;
    const before = structuredClone(state);
    const error = captureError(() => resolve([], state));
    expectResolutionError(error, "INVALID_INPUT");
    expect(state).toEqual(before);
  });

  it.each(["relationship", "scheduled event"] as const)(
    "rejects duplicate %s IDs in the initial state",
    (collection) => {
      const state = createState();
      if (collection === "relationship") {
        state.relationships = [
          createRelationship({ id: "duplicate" }),
          createRelationship({ id: "duplicate", characterId: "other" }),
        ];
      } else {
        const event = {
          id: "duplicate",
          eventId: "future_event",
          sourceEventId: "source_event",
          priority: 0,
          createdAtTurn: 0,
          consumed: false,
          triggerType: "turn" as const,
          triggerValue: 1,
        };
        state.scheduledEvents = [event, { ...event, eventId: "other_event" }];
      }
      const before = structuredClone(state);
      const error = captureError(() => resolve([], state));
      expectResolutionError(error, "INVALID_INPUT");
      expect(state).toEqual(before);
    },
  );

  it.each([
    [
      0,
      [{ type: "player_stat", field: "unknown", operation: "set", value: 1 }],
    ],
    [
      1,
      [
        { type: "player_stat", field: "mood", operation: "set", value: 20 },
        { type: "flag", key: "bad", value: null },
      ],
    ],
  ] as const)(
    "rejects an invalid effect at index %s before applying",
    (index, effects) => {
      const state = createState();
      const before = structuredClone(state);
      const error = captureError(() =>
        resolveRuntime(effects, state, choiceContext),
      );
      const resolutionError = expectResolutionError(error, "INVALID_INPUT", {
        effectIndex: index,
        effectType: effects[index]!.type as GameEffect["type"],
      });
      expect(resolutionError.cause).toBeDefined();
      expect(state).toEqual(before);
    },
  );

  it.each([
    ["explicit undefined", [{ type: "flag", key: "bad", value: undefined }]],
    ["Date", [new Date(0)]],
    ["function", [() => undefined]],
    [
      "BigInt",
      [{ type: "player_stat", field: "mood", operation: "set", value: 1n }],
    ],
    [
      "NaN",
      [
        {
          type: "player_stat",
          field: "mood",
          operation: "set",
          value: Number.NaN,
        },
      ],
    ],
    [
      "Infinity",
      [
        {
          type: "player_stat",
          field: "mood",
          operation: "set",
          value: Infinity,
        },
      ],
    ],
  ])("rejects nonpersistible or invalid effect input: %s", (_name, effects) => {
    const state = createState();
    const before = structuredClone(state);
    const error = captureError(() =>
      resolveRuntime(effects, state, choiceContext),
    );
    expect(error).toBeInstanceOf(EventEffectResolutionError);
    expect(error).toMatchObject({ code: "INVALID_INPUT" });
    expect(state).toEqual(before);
  });

  it("rejects a circular effects value", () => {
    const circular: unknown[] = [];
    circular.push(circular);
    const error = captureError(() =>
      resolveRuntime(circular, createState(), choiceContext),
    );
    expectResolutionError(error, "INVALID_INPUT");
  });

  it("does not invent effectType for an unknown discriminator", () => {
    const error = captureError(() =>
      resolveRuntime([{ type: "unknown" }], createState(), choiceContext),
    );
    expect(error).toBeInstanceOf(EventEffectResolutionError);
    expect(error).toMatchObject({ code: "INVALID_INPUT", effectIndex: 0 });
    expect(error).not.toHaveProperty("effectType");
  });
});

describe("strict context validation", () => {
  it.each([
    ["choice", choiceContext],
    [
      "outcome",
      {
        ...choiceContext,
        source: { phase: "outcome", outcomeId: "outcome_one" },
      },
    ],
  ] as const)(
    "accepts a valid %s context without mutating it",
    (_name, context) => {
      const before = structuredClone(context);
      const result = resolve([], createState(), context);
      expect(result.appliedEffects).toEqual([]);
      expect(context).toEqual(before);
    },
  );

  it.each([
    [
      "choice with outcomeId",
      { ...choiceContext, source: { phase: "choice", outcomeId: "bad" } },
    ],
    [
      "outcome without outcomeId",
      { ...choiceContext, source: { phase: "outcome" } },
    ],
    [
      "invalid sourceEventId",
      { ...choiceContext, sourceEventId: "Invalid-ID" },
    ],
    ["invalid choiceId", { ...choiceContext, choiceId: "Invalid-ID" }],
    ["zero version", { ...choiceContext, sourceEventVersion: 0 }],
    ["negative version", { ...choiceContext, sourceEventVersion: -1 }],
    ["fractional version", { ...choiceContext, sourceEventVersion: 1.5 }],
    [
      "unsafe version",
      { ...choiceContext, sourceEventVersion: Number.MAX_VALUE },
    ],
    ["extra key", { ...choiceContext, extra: true }],
    ["explicit undefined", { ...choiceContext, source: undefined }],
  ])("rejects context: %s", (_name, context) => {
    const before = structuredClone(context);
    const error = captureError(() =>
      resolveRuntime([], createState(), context),
    );
    expectResolutionError(error, "INVALID_INPUT");
    expect(context).toEqual(before);
  });

  it("rejects a Symbol property", () => {
    const context = { ...choiceContext, [Symbol("extra")]: true };
    const error = captureError(() =>
      resolveRuntime([], createState(), context),
    );
    expectResolutionError(error, "INVALID_INPUT");
  });
});

describe("sequential dispatch and records", () => {
  it("applies scalar and counter effects sequentially", () => {
    const result = resolve([
      { type: "player_stat", field: "mood", operation: "set", value: 20 },
      { type: "player_stat", field: "mood", operation: "add", value: 10 },
      { type: "counter", key: "attempts", operation: "set", value: 2 },
      { type: "counter", key: "attempts", operation: "increment", value: 3 },
    ]);

    expect(result.nextState.stats.mood).toBe(30);
    expect(result.nextState.history.counters.attempts).toBe(5);
    expect(result.appliedEffects[1]).toMatchObject({
      sourceEffectIndex: 1,
      previous: { exists: true, value: 20 },
      resulting: { exists: true, value: 30 },
    });
    expect(result.appliedEffects[3]).toMatchObject({
      sourceEffectIndex: 3,
      previous: { exists: true, value: 2 },
      resulting: { exists: true, value: 5 },
    });
  });

  it("lets later relationship effects see a newly created relationship", () => {
    const result = resolve([
      creationEffect(),
      {
        type: "relationship_value",
        selector: { relationshipId: "relationship_new" },
        field: "trust",
        operation: "add",
        value: 10,
      },
      { type: "deactivate_relationship", relationshipId: "relationship_new" },
    ]);
    expect(result.nextState.relationships[0]).toMatchObject({
      id: "relationship_new",
      trust: 50,
      isActive: false,
    });
    expect(
      result.appliedEffects.map((record) => record.sourceEffectIndex),
    ).toEqual([0, 1, 2]);
  });

  it("lets a relationship value effect read the preceding result", () => {
    const state = createState([createRelationship({ trust: 20 })]);
    const result = resolve(
      [
        {
          type: "relationship_value",
          selector: { relationshipId: "relationship-1" },
          field: "trust",
          operation: "add",
          value: 10,
        },
        {
          type: "relationship_value",
          selector: { relationshipId: "relationship-1" },
          field: "trust",
          operation: "add",
          value: 5,
        },
      ],
      state,
    );
    expect(result.nextState.relationships[0]?.trust).toBe(35);
    expect(result.appliedEffects[1]).toMatchObject({
      previous: { exists: true, value: 30 },
      resulting: { exists: true, value: 35 },
    });
  });

  it("keeps relationship 1-to-N records before a later flag", () => {
    const state = createState([
      createRelationship({ id: "first", type: "friend" }),
      createRelationship({ id: "second", type: "friend" }),
    ]);
    const result = resolve(
      [
        {
          type: "relationship_value",
          selector: { type: "friend" },
          field: "affection",
          operation: "add",
          value: 1,
        },
        { type: "flag", key: "updated", value: true },
      ],
      state,
    );
    expect(
      result.appliedEffects.map((record) => [
        record.type,
        record.sourceEffectIndex,
        record.type === "relationship_value"
          ? record.relationshipId
          : undefined,
      ]),
    ).toEqual([
      ["relationship_value", 0, "first"],
      ["relationship_value", 0, "second"],
      ["flag", 1, undefined],
    ]);
  });

  it("gives consecutive schedules different IDs from their effect indexes", () => {
    const result = resolve([scheduleEffect(), scheduleEffect()]);
    expect(result.nextState.scheduledEvents).toHaveLength(2);
    expect(result.nextState.scheduledEvents[0]?.id).not.toBe(
      result.nextState.scheduledEvents[1]?.id,
    );
    expect(
      result.appliedEffects.map((record) => record.sourceEffectIndex),
    ).toEqual([0, 1]);
  });

  it("dispatches all ten effect families in a coherent batch", () => {
    const result = resolve([
      { type: "player_stat", field: "energy", operation: "add", value: -1 },
      {
        type: "football_attribute",
        field: "technique",
        operation: "add",
        value: 2,
      },
      { type: "life_state", field: "city", operation: "set", value: "Córdoba" },
      {
        type: "football_state",
        field: "teamTrust",
        operation: "set",
        value: 10,
      },
      { type: "flag", key: "all_families", value: true },
      { type: "counter", key: "batches", operation: "increment", value: 1 },
      creationEffect(),
      {
        type: "relationship_value",
        selector: { relationshipId: "relationship_new" },
        field: "affection",
        operation: "add",
        value: 1,
      },
      { type: "deactivate_relationship", relationshipId: "relationship_new" },
      scheduleEffect(),
    ]);
    expect(result.appliedEffects.map((record) => record.type)).toEqual([
      "player_stat",
      "football_attribute",
      "life_state",
      "football_state",
      "flag",
      "counter",
      "create_relationship",
      "relationship_value",
      "deactivate_relationship",
      "schedule_event",
    ]);
    expect(
      result.appliedEffects.map((record) => record.sourceEffectIndex),
    ).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
});

describe("intermediate and final state validation", () => {
  it("allows an temporarily invalid injury transition that ends valid", () => {
    const result = resolve([
      {
        type: "football_state",
        field: "isInjured",
        operation: "set",
        value: true,
      },
      {
        type: "football_state",
        field: "currentInjuryId",
        operation: "set",
        value: "injury_one",
      },
    ]);
    expect(result.nextState.football).toMatchObject({
      isInjured: true,
      currentInjuryId: "injury_one",
    });
  });

  it("allows a temporarily invalid retirement transition that ends valid", () => {
    const result = resolve([
      {
        type: "football_state",
        field: "retirementStatus",
        operation: "set",
        value: "permanently_retired",
      },
      {
        type: "football_state",
        field: "status",
        operation: "set",
        value: "retired",
      },
    ]);
    expect(result.nextState.football).toMatchObject({
      retirementStatus: "permanently_retired",
      status: "retired",
    });
  });

  it("maps an invalid final state without attributing it to one effect", () => {
    const state = createState();
    const before = structuredClone(state);
    const error = captureError(() =>
      resolve(
        [
          {
            type: "football_state",
            field: "isInjured",
            operation: "set",
            value: true,
          },
        ],
        state,
      ),
    );
    expectResolutionError(error, "INVALID_RESULT_STATE");
    expect(state).toEqual(before);
  });

  it("discards multiple applied changes when final validation fails", () => {
    const state = createState();
    const originalStateSnapshot = structuredClone(state);
    const effects: readonly GameEffect[] = [
      {
        type: "player_stat",
        field: "mood",
        operation: "set",
        value: 20,
      },
      { type: "flag", key: "work_was_discarded", value: true },
      {
        type: "football_state",
        field: "isInjured",
        operation: "set",
        value: true,
      },
    ];

    const error = captureError(() => resolve(effects, state));

    expect(error).toBeInstanceOf(EventEffectResolutionError);
    if (!(error instanceof EventEffectResolutionError)) {
      throw new Error("Expected EventEffectResolutionError");
    }
    expect(error).toMatchObject({ code: "INVALID_RESULT_STATE" });
    expect(Object.hasOwn(error, "effectIndex")).toBe(false);
    expect(Object.hasOwn(error, "effectType")).toBe(false);
    expect(error).toHaveProperty("cause");
    expect(state).toEqual(originalStateSnapshot);
    expect(state.stats.mood).toBe(originalStateSnapshot.stats.mood);
    expect(Object.hasOwn(state.history.flags, "work_was_discarded")).toBe(
      false,
    );
    expect(state.history.decisions).toEqual(
      originalStateSnapshot.history.decisions,
    );
  });
});

describe("atomicity and public error mapping", () => {
  it("discards an earlier stat change when a later numeric result fails", () => {
    const state = createState();
    const before = structuredClone(state);
    const error = captureError(() =>
      resolve(
        [
          { type: "player_stat", field: "mood", operation: "set", value: 20 },
          {
            type: "player_stat",
            field: "energy",
            operation: "multiply",
            value: Number.MAX_VALUE,
          },
        ],
        state,
      ),
    );
    const publicError = expectResolutionError(error, "INVALID_NUMERIC_RESULT", {
      effectIndex: 1,
      effectType: "player_stat",
    });
    expect(publicError.cause).toBeInstanceOf(InternalEffectApplicationError);
    expect(state).toEqual(before);
  });

  it("discards a relationship change before a duplicate creation", () => {
    const state = createState([
      createRelationship({ id: "duplicate", trust: 20 }),
    ]);
    const before = structuredClone(state);
    const duplicate = creationEffect("duplicate");
    const error = captureError(() =>
      resolve(
        [
          {
            type: "relationship_value",
            selector: { relationshipId: "duplicate" },
            field: "trust",
            operation: "add",
            value: 10,
          },
          duplicate,
        ],
        state,
      ),
    );
    const publicError = expectResolutionError(
      error,
      "RELATIONSHIP_ID_CONFLICT",
      {
        effectIndex: 1,
        effectType: "create_relationship",
      },
    );
    expect(publicError.cause).toBeInstanceOf(InternalEffectApplicationError);
    expect(state).toEqual(before);
  });

  it("maps missing relationship and selector errors", () => {
    const missing = captureError(() =>
      resolve([{ type: "deactivate_relationship", relationshipId: "missing" }]),
    );
    expectResolutionError(missing, "RELATIONSHIP_NOT_FOUND", {
      effectIndex: 0,
      effectType: "deactivate_relationship",
    });

    const noMatch = captureError(() =>
      resolve([
        {
          type: "relationship_value",
          selector: { relationshipId: "missing" },
          field: "trust",
          operation: "add",
          value: 1,
        },
      ]),
    );
    expectResolutionError(noMatch, "RELATIONSHIP_SELECTOR_NO_MATCH", {
      effectIndex: 0,
      effectType: "relationship_value",
    });
  });

  it("maps a past schedule trigger", () => {
    const state = createState();
    state.life.age = 18;
    const before = structuredClone(state);
    const error = captureError(() =>
      resolve([scheduleEffect({ type: "age", atAge: 17 })], state),
    );
    expectResolutionError(error, "TRIGGER_IN_THE_PAST", {
      effectIndex: 0,
      effectType: "schedule_event",
    });
    expect(state).toEqual(before);
  });

  it("discards a prior schedule when a later schedule collides", () => {
    const probe = resolve([
      { type: "flag", key: "probe", value: true },
      scheduleEffect(),
    ]);
    const collision = probe.nextState.scheduledEvents[0];
    if (collision === undefined) throw new Error("Expected scheduled event");
    const state = createState();
    state.scheduledEvents.push(structuredClone(collision));
    const before = structuredClone(state);
    const error = captureError(() =>
      resolve(
        [scheduleEffect({ type: "turn", afterTurns: 2 }), scheduleEffect()],
        state,
      ),
    );
    expectResolutionError(error, "SCHEDULED_EVENT_ID_CONFLICT", {
      effectIndex: 1,
      effectType: "schedule_event",
    });
    expect(state).toEqual(before);
  });
});

describe("derived level, history, references, and determinism", () => {
  it("recalculates footballLevel from all final attribute values", () => {
    const state = createState();
    const originalLevel = state.stats.footballLevel;
    const result = resolve(
      [
        {
          type: "football_attribute",
          field: "technique",
          operation: "add",
          value: 20,
        },
        {
          type: "football_attribute",
          field: "physicalCondition",
          operation: "add",
          value: 10,
        },
      ],
      state,
    );
    expect(result.nextState.stats.footballLevel).toBe(
      calculateFootballLevel(result.nextState.footballAttributes),
    );
    expect(result.nextState.stats.footballLevel).not.toBe(originalLevel);
    expect(result.appliedEffects.map((record) => record.type)).toEqual([
      "football_attribute",
      "football_attribute",
    ]);
  });

  it("does not create DecisionRecord but persists flags and counters", () => {
    const state = createState();
    const beforeDecisions = structuredClone(state.history.decisions);
    const result = resolve(
      [
        { type: "flag", key: "resolved", value: true },
        {
          type: "counter",
          key: "resolved_count",
          operation: "increment",
          value: 1,
        },
      ],
      state,
    );
    expect(result.nextState.history.decisions).toEqual(beforeDecisions);
    expect(result.nextState.history.flags.resolved).toBe(true);
    expect(result.nextState.history.counters.resolved_count).toBe(1);
  });

  it("keeps relationship state and audit snapshots independent", () => {
    const effects = [creationEffect()] as const;
    const result = resolve(effects);
    const record = result.appliedEffects[0];
    if (record?.type !== "create_relationship" || !record.resulting.exists) {
      throw new Error("Expected applied relationship creation");
    }
    result.nextState.relationships[0]!.tags.push("state_only");
    expect(record.resulting.value.tags).not.toContain("state_only");
    record.resulting.value.tags.push("audit_only");
    expect(result.nextState.relationships[0]?.tags).not.toContain("audit_only");
    expect(effects[0].relationship.tags).toEqual(["new_friend"]);
  });

  it("keeps condition scheduling state, requested, and resulting independent", () => {
    const effect = scheduleEffect({
      type: "condition",
      conditions: {
        mode: "all",
        conditions: [{ type: "flag", key: "ready", operator: "exists" }],
      },
    });
    const result = resolve([effect]);
    const record = result.appliedEffects[0];
    const persisted = result.nextState.scheduledEvents[0];
    if (
      record?.type !== "schedule_event" ||
      effect.followUp.trigger.type !== "condition" ||
      record.requested.followUp.trigger.type !== "condition" ||
      record.resulting.value.triggerType !== "condition" ||
      persisted?.triggerType !== "condition"
    ) {
      throw new Error("Expected condition scheduling");
    }
    persisted.conditions.conditions.push({
      type: "flag",
      key: "state_only",
      operator: "exists",
    });
    expect(
      record.requested.followUp.trigger.conditions.conditions,
    ).toHaveLength(1);
    expect(record.resulting.value.conditions.conditions).toHaveLength(1);
    record.resulting.value.conditions.conditions.push({
      type: "flag",
      key: "audit_only",
      operator: "exists",
    });
    expect(persisted.conditions.conditions).toHaveLength(2);
    expect(effect.followUp.trigger.conditions.conditions).toHaveLength(1);
  });

  it("does not mutate effects, context, source, or original state", () => {
    const effects: GameEffect[] = [
      { type: "player_stat", field: "mood", operation: "add", value: 1 },
      scheduleEffect(),
    ];
    const context: EffectResolutionContext = {
      ...choiceContext,
      source: { phase: "outcome", outcomeId: "outcome_one" },
    };
    const state = createState();
    const effectsBefore = structuredClone(effects);
    const contextBefore = structuredClone(context);
    const stateBefore = structuredClone(state);
    const result = resolve(effects, state, context);
    expect(effects).toEqual(effectsBefore);
    expect(context).toEqual(contextBefore);
    expect(state).toEqual(stateBefore);
    expect(result.appliedEffects[0]?.source).not.toBe(context.source);
  });

  it("is deterministic for deeply equivalent inputs", () => {
    const effects: GameEffect[] = [
      { type: "counter", key: "runs", operation: "increment", value: 1 },
      scheduleEffect(),
    ];
    const first = resolve(structuredClone(effects), createState(), {
      ...choiceContext,
      source: { phase: "outcome", outcomeId: "outcome_one" },
    });
    const second = resolve(structuredClone(effects), createState(), {
      ...choiceContext,
      source: { phase: "outcome", outcomeId: "outcome_one" },
    });
    expect(first.nextState).toEqual(second.nextState);
    expect(first.appliedEffects).toEqual(second.appliedEffects);
    expect(first.nextState.scheduledEvents.map((event) => event.id)).toEqual(
      second.nextState.scheduledEvents.map((event) => event.id),
    );
  });
});
