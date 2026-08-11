import { describe, expect, it } from "vitest";
import {
  AppliedEffectSchema,
  ScheduledEventSchema,
} from "@amateur-app/shared-types";

import {
  createInitialGameState,
  deserializeGameState,
  serializeGameState,
  validateGameState,
} from "../src/index.js";
import { createInput } from "./test-fixtures.js";

describe("game-state serialization", () => {
  it("round-trips a valid game state", () => {
    const state = createInitialGameState(createInput());
    expect(deserializeGameState(serializeGameState(state))).toEqual(state);
  });

  it("round-trips valid dynamic history values exactly", () => {
    const state = createInitialGameState(createInput());
    state.history.flags = {
      boolean_false: false,
      numeric_zero: 0,
      empty_string: "",
      accepted_offer: true,
    };
    state.history.counters = {
      zero_count: 0,
      attempt_count: 3,
      safe_maximum: Number.MAX_SAFE_INTEGER,
    };

    const restored = deserializeGameState(serializeGameState(state));

    expect(restored.history.flags).toEqual(state.history.flags);
    expect(restored.history.counters).toEqual(state.history.counters);
    expect(Object.hasOwn(restored.history.flags, "boolean_false")).toBe(true);
    expect(Object.hasOwn(restored.history.flags, "numeric_zero")).toBe(true);
    expect(Object.hasOwn(restored.history.flags, "empty_string")).toBe(true);
    expect(Object.hasOwn(restored.history.counters, "zero_count")).toBe(true);
  });

  it("round-trips all AppliedEffect families with sources and snapshots", () => {
    const state = createInitialGameState(createInput());
    const relationship = {
      id: "relationship-1",
      characterId: "character_1",
      type: "friend" as const,
      displayName: "Sam",
      affection: 50,
      trust: 60,
      conflict: 10,
      isActive: true,
      isAlive: true,
      startedAtAge: 14,
      tags: ["childhood_friend"],
    };
    const inactiveRelationship = { ...relationship, isActive: false as const };
    const source = { phase: "choice" as const };
    const scalar = (
      type:
        | "player_stat"
        | "football_attribute"
        | "life_state"
        | "football_state"
        | "flag"
        | "counter",
      requested: Record<string, boolean | number | string>,
      previous: boolean | number | string,
      resulting: boolean | number | string,
    ) => ({
      type,
      source,
      sourceEffectIndex: 0,
      status: "applied" as const,
      requested,
      previous: { exists: true as const, value: previous },
      resulting: { exists: true as const, value: resulting },
    });
    const rawImmediateEffects = [
      scalar(
        "player_stat",
        { field: "mood", operation: "add", value: 5 },
        50,
        55,
      ),
      scalar(
        "football_attribute",
        { field: "technique", operation: "set", value: 60 },
        50,
        60,
      ),
      scalar(
        "life_state",
        { field: "city", operation: "set", value: "Córdoba" },
        "Rosario",
        "Córdoba",
      ),
      scalar(
        "football_state",
        { field: "status", operation: "set", value: "academy" },
        "without_team",
        "academy",
      ),
      scalar("flag", { key: "accepted_offer", value: true }, false, true),
      scalar(
        "counter",
        { key: "attempts", operation: "increment", value: 1 },
        0,
        1,
      ),
      {
        type: "relationship_value",
        source,
        sourceEffectIndex: 6,
        status: "applied",
        requested: {
          selector: { type: "friend" },
          field: "trust",
          operation: "add",
          value: 5,
        },
        relationshipId: relationship.id,
        previous: { exists: true, value: 60 },
        resulting: { exists: true, value: 65 },
      },
      {
        type: "create_relationship",
        source,
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
            tags: relationship.tags,
          },
          conflictPolicy: "error",
        },
        previous: { exists: false },
        resulting: { exists: true, value: relationship },
      },
      {
        type: "deactivate_relationship",
        source,
        sourceEffectIndex: 8,
        status: "applied",
        requested: { relationshipId: relationship.id },
        previous: { exists: true, value: relationship },
        resulting: { exists: true, value: inactiveRelationship },
      },
      {
        type: "schedule_event",
        source: { phase: "outcome", outcomeId: "accepted" },
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
          value: {
            id: "scheduled-1",
            eventId: "next_event",
            sourceEventId: "event_1",
            priority: 1,
            createdAtTurn: 0,
            consumed: false,
            triggerType: "turn",
            triggerValue: 2,
          },
        },
      },
    ];
    const immediateEffects = rawImmediateEffects.map((effect) =>
      AppliedEffectSchema.parse(effect),
    );
    state.history.decisions.push({
      eventId: "event_1",
      eventVersion: 1,
      choiceId: "choice_1",
      age: 14,
      season: 1,
      turn: 0,
      immediateEffects,
    });

    expect(deserializeGameState(serializeGameState(state))).toEqual(state);
  });

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
  ])("round-trips a scheduled $triggerType event", (trigger) => {
    const state = createInitialGameState(createInput());
    const scheduledEvent = ScheduledEventSchema.parse({
      id: `scheduled-${trigger.triggerType}`,
      eventId: "next_event",
      sourceEventId: "source_event",
      priority: 1,
      createdAtTurn: 0,
      consumed: false,
      ...trigger,
    });
    state.scheduledEvents.push(scheduledEvent);

    const serialized = serializeGameState(state);
    const restored = deserializeGameState(serialized);

    expect(serialized).toBeTypeOf("string");
    expect(restored.scheduledEvents).toEqual([scheduledEvent]);
    if (scheduledEvent.triggerType === "condition") {
      expect(scheduledEvent).not.toHaveProperty("triggerValue");
    } else {
      expect(scheduledEvent).not.toHaveProperty("conditions");
    }
  });

  it("rejects malformed JSON with a comprehensible error", () => {
    expect(() => deserializeGameState("{bad json")).toThrow(/malformed JSON/);
  });

  it("rejects structurally invalid parsed JSON", () => {
    expect(() =>
      deserializeGameState(JSON.stringify({ runId: "run" })),
    ).toThrow(/Invalid game state/);
  });

  it("rejects an inconsistent persisted football level", () => {
    const state = createInitialGameState(createInput());
    const serialized = JSON.stringify({
      ...state,
      stats: { ...state.stats, footballLevel: state.stats.footballLevel + 1 },
    });
    expect(() => deserializeGameState(serialized)).toThrow(
      /stats\.footballLevel must be/,
    );
  });

  it("validates before serializing", () => {
    const state = createInitialGameState(createInput());
    state.stats.mood = 101;
    expect(() => serializeGameState(state)).toThrow(/stats\.mood/);
  });

  it("preserves spaced identifiers through validation and round-trip", () => {
    const state = createInitialGameState(
      createInput({
        runId: " run-1 ",
        profileId: " profile-1 ",
        seed: " seed-1 ",
      }),
    );
    const validated = validateGameState(state);
    const serialized = serializeGameState(state);
    const parsed = JSON.parse(serialized) as unknown;
    const restored = deserializeGameState(serialized);

    expect(validated.runId).toBe(" run-1 ");
    expect(validated.profile.id).toBe(" profile-1 ");
    expect(validated.seed).toBe(" seed-1 ");
    expect(parsed).toMatchObject({
      runId: " run-1 ",
      seed: " seed-1 ",
      profile: { id: " profile-1 " },
    });
    expect(restored.runId).toBe(" run-1 ");
    expect(restored.profile.id).toBe(" profile-1 ");
    expect(restored.seed).toBe(" seed-1 ");
    expect(restored).toEqual(state);
  });

  it.each([
    [
      "birthCity",
      (state: ReturnType<typeof createInitialGameState>) => {
        Object.defineProperty(state.profile, "birthCity", {
          value: undefined,
          enumerable: true,
          configurable: true,
        });
      },
    ],
    [
      "currentEventId",
      (state: ReturnType<typeof createInitialGameState>) => {
        Object.defineProperty(state, "currentEventId", {
          value: undefined,
          enumerable: true,
          configurable: true,
        });
      },
    ],
    [
      "nested property",
      (state: ReturnType<typeof createInitialGameState>) => {
        (state.history.flags as Record<string, unknown>).nested = undefined;
      },
    ],
  ] as const)(
    "rejects explicit undefined before serializing %s",
    (_name, mutate) => {
      const state = createInitialGameState(createInput());
      mutate(state);
      expect(() => serializeGameState(state)).toThrow(
        /undefined is not a persistible value/,
      );
    },
  );
});
