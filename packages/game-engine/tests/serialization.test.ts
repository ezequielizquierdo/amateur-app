import { describe, expect, it } from "vitest";
import { ScheduledEventSchema } from "@amateur-app/shared-types";

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

  it("round-trips nested JsonValue fields", () => {
    const state = createInitialGameState(createInput());
    state.history.decisions.push({
      eventId: "event_1",
      eventVersion: 1,
      choiceId: "choice_1",
      age: 14,
      season: 1,
      turn: 0,
      immediateEffects: [
        {
          field: "history.flags.example",
          previousValue: null,
          appliedValue: { nested: ["value", 1, true, null] },
          resultingValue: { accepted: true },
          operation: "set",
        },
      ],
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
