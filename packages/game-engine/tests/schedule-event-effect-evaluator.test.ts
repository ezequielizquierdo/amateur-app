import {
  AppliedEffectSchema,
  ScheduleEventEffectSchema,
  ScheduledEventSchema,
  type GameState,
  type ScheduleEventEffect,
  type ScheduledEvent,
} from "@amateur-app/shared-types";
import { describe, expect, it } from "vitest";

import { applyScheduleEventEffect } from "../src/events/effects/apply-schedule-event-effect.js";
import { InternalEffectApplicationError } from "../src/events/effects/internal-effect-application-error.js";
import { createInitialGameState } from "../src/index.js";
import { createInput } from "./test-fixtures.js";

type ScheduleEffectContext = Parameters<typeof applyScheduleEventEffect>[2];

function createState(overrides: Partial<GameState> = {}): GameState {
  return {
    ...createInitialGameState(createInput()),
    ...overrides,
  };
}

function createEffect(
  trigger: ScheduleEventEffect["followUp"]["trigger"] = {
    type: "turn",
    afterTurns: 1,
  },
): ScheduleEventEffect {
  return {
    type: "schedule_event",
    followUp: {
      eventId: "future_event",
      trigger,
      priority: 7,
    },
  };
}

function createContext(
  overrides: Partial<ScheduleEffectContext> = {},
): ScheduleEffectContext {
  return {
    sourceEventId: "source_event",
    sourceEventVersion: 3,
    choiceId: "choice_one",
    source: { phase: "choice" },
    sourceEffectIndex: 2,
    ...overrides,
  };
}

function apply(
  effect = createEffect(),
  state = createState(),
  context = createContext(),
) {
  const record = applyScheduleEventEffect(effect, state, context);
  return { context, effect, record, state };
}

function scheduledEvent(
  overrides: Partial<ScheduledEvent> = {},
): ScheduledEvent {
  return ScheduledEventSchema.parse({
    id: "existing-scheduled-event",
    eventId: "existing_event",
    sourceEventId: "existing_source",
    priority: 1,
    createdAtTurn: 0,
    consumed: false,
    triggerType: "turn",
    triggerValue: 10,
    ...overrides,
  });
}

describe("applyScheduleEventEffect", () => {
  describe("deterministic ID", () => {
    it("produces the same ID and record for the same independent inputs", () => {
      const first = apply();
      const second = apply();

      expect(first.record.resulting.value.id).toBe(
        second.record.resulting.value.id,
      );
      expect(first.record).toEqual(second.record);
      expect(first.state).toEqual(second.state);
      expect(first.record.resulting.value.id).toMatch(/^scheduled_event:v1:/);
      expect(
        ScheduledEventSchema.safeParse(first.record.resulting.value).success,
      ).toBe(true);
    });

    it.each([
      ["runId", () => createState({ runId: "another-run" }), createContext()],
      ["currentTurn", () => createState({ currentTurn: 4 }), createContext()],
      [
        "sourceEventId",
        () => createState(),
        createContext({ sourceEventId: "another_source" }),
      ],
      [
        "sourceEventVersion",
        () => createState(),
        createContext({ sourceEventVersion: 4 }),
      ],
      [
        "choiceId",
        () => createState(),
        createContext({ choiceId: "choice_two" }),
      ],
      [
        "sourceEffectIndex",
        () => createState(),
        createContext({ sourceEffectIndex: 3 }),
      ],
    ] as const)("changes when %s changes", (_name, stateFactory, context) => {
      const baseline = apply();
      const changed = apply(createEffect(), stateFactory(), context);
      expect(changed.record.resulting.value.id).not.toBe(
        baseline.record.resulting.value.id,
      );
    });

    it("distinguishes choice from outcome and different outcome IDs", () => {
      const choice = apply();
      const outcomeA = apply(
        createEffect(),
        createState(),
        createContext({
          source: { phase: "outcome", outcomeId: "outcome_a" },
        }),
      );
      const outcomeB = apply(
        createEffect(),
        createState(),
        createContext({
          source: { phase: "outcome", outcomeId: "outcome_b" },
        }),
      );

      expect(
        new Set([
          choice.record.resulting.value.id,
          outcomeA.record.resulting.value.id,
          outcomeB.record.resulting.value.id,
        ]),
      ).toHaveProperty("size", 3);
    });

    it("length-prefixes delimiter-like content without collisions", () => {
      const first = apply(createEffect(), createState({ runId: "a:b" }));
      const second = apply(createEffect(), createState({ runId: "a:bc" }));
      expect(first.record.resulting.value.id).not.toBe(
        second.record.resulting.value.id,
      );
      expect(first.record.resulting.value.id).toContain("3:a:b");
      expect(second.record.resulting.value.id).toContain("4:a:bc");
    });

    it("distinguishes a plus 12 from a1 plus 2", () => {
      const first = apply(
        createEffect(),
        createState({ runId: "a", currentTurn: 12 }),
      );
      const second = apply(
        createEffect(),
        createState({ runId: "a1", currentTurn: 2 }),
      );
      expect(first.record.resulting.value.id).not.toBe(
        second.record.resulting.value.id,
      );
    });
  });

  describe("trigger conversion", () => {
    it.each([
      [1, 5, 6],
      [8, 5, 13],
    ] as const)(
      "converts afterTurns %s from turn %s to %s",
      (afterTurns, currentTurn, expected) => {
        const { record, state } = apply(
          createEffect({ type: "turn", afterTurns }),
          createState({ currentTurn }),
        );
        expect(record.resulting.value).toMatchObject({
          eventId: "future_event",
          sourceEventId: "source_event",
          priority: 7,
          triggerType: "turn",
          triggerValue: expected,
          createdAtTurn: currentTurn,
          consumed: false,
        });
        expect(state.scheduledEvents[0]).toEqual(record.resulting.value);
      },
    );

    it("rejects a non-finite turn sum without writing", () => {
      const state = createState({ currentTurn: Number.MAX_VALUE });
      const before = structuredClone(state.scheduledEvents);
      expect(() =>
        apply(
          createEffect({ type: "turn", afterTurns: Number.MAX_VALUE }),
          state,
        ),
      ).toThrow(InternalEffectApplicationError);
      expect(state.scheduledEvents).toEqual(before);
      try {
        apply(
          createEffect({ type: "turn", afterTurns: Number.MAX_VALUE }),
          state,
        );
      } catch (error) {
        expect(error).toMatchObject({ code: "INVALID_NUMERIC_RESULT" });
      }
    });

    it.each([
      ["age", 20, 18],
      ["age", 18, 18],
      ["season", 5, 3],
      ["season", 3, 3],
    ] as const)(
      "schedules %s trigger %s when current value is %s",
      (type, triggerValue, currentValue) => {
        const state =
          type === "age"
            ? createState({
                life: { ...createState().life, age: currentValue },
              })
            : createState({ currentSeason: currentValue });
        const trigger =
          type === "age"
            ? ({ type, atAge: triggerValue } as const)
            : ({ type, atSeason: triggerValue } as const);
        const { record } = apply(createEffect(trigger), state);
        expect(record.resulting.value).toMatchObject({
          triggerType: type,
          triggerValue,
          consumed: false,
        });
        expect(state.scheduledEvents).toHaveLength(1);
      },
    );

    it.each([
      ["age", { type: "age", atAge: 17 } as const],
      ["season", { type: "season", atSeason: 2 } as const],
    ])("rejects a past %s trigger without writing", (_name, trigger) => {
      const state = createState({
        life: { ...createState().life, age: 18 },
        currentSeason: 3,
      });
      const before = structuredClone(state.scheduledEvents);
      expect(() => apply(createEffect(trigger), state)).toThrow(
        InternalEffectApplicationError,
      );
      expect(state.scheduledEvents).toEqual(before);
      try {
        apply(createEffect(trigger), state);
      } catch (error) {
        expect(error).toMatchObject({ code: "TRIGGER_IN_THE_PAST" });
      }
    });

    it.each(["all", "any"] as const)(
      "copies a condition group in %s mode without evaluating it",
      (mode) => {
        const effect = createEffect({
          type: "condition",
          conditions: {
            mode,
            conditions: [
              { type: "flag", key: "not_set", operator: "equals", value: true },
            ],
          },
        });
        const effectBefore = structuredClone(effect);
        const { record, state } = apply(effect);
        const inserted = state.scheduledEvents[0];

        expect(inserted).toMatchObject({
          triggerType: "condition",
          conditions:
            effect.followUp.trigger.type === "condition"
              ? effect.followUp.trigger.conditions
              : undefined,
          consumed: false,
        });
        expect(inserted).not.toHaveProperty("triggerValue");
        expect(effect).toEqual(effectBefore);
        if (
          effect.followUp.trigger.type !== "condition" ||
          record.requested.followUp.trigger.type !== "condition" ||
          inserted?.triggerType !== "condition" ||
          record.resulting.value.triggerType !== "condition"
        ) {
          throw new Error("Expected condition trigger variants");
        }
        const original = effect.followUp.trigger.conditions;
        const requested = record.requested.followUp.trigger.conditions;
        const persisted = inserted.conditions;
        const resulting = record.resulting.value.conditions;
        expect(requested).not.toBe(original);
        expect(persisted).not.toBe(original);
        expect(resulting).not.toBe(original);
        expect(requested).not.toBe(persisted);
        expect(requested).not.toBe(resulting);
        expect(persisted).not.toBe(resulting);
        persisted.conditions.push({
          type: "flag",
          key: "state_only",
          operator: "exists",
        });
        expect(original.conditions).toHaveLength(1);
        expect(requested.conditions).toHaveLength(1);
        expect(resulting.conditions).toHaveLength(1);
      },
    );
  });

  describe("insertion and collision", () => {
    it("appends without sorting or modifying existing events", () => {
      const first = scheduledEvent({
        id: "first",
        priority: -20,
        triggerValue: 100,
      });
      const second = scheduledEvent({
        id: "second",
        priority: 100,
        triggerValue: 1,
      });
      const state = createState({ scheduledEvents: [first, second] });
      const existingBefore = structuredClone(state.scheduledEvents);
      apply(createEffect(), state);

      expect(state.scheduledEvents.slice(0, 2)).toEqual(existingBefore);
      expect(
        state.scheduledEvents.map((event) => event.id).slice(0, 2),
      ).toEqual(["first", "second"]);
      expect(state.scheduledEvents).toHaveLength(3);
    });

    it("rejects a generated ID collision without fallback or mutation", () => {
      const generated = apply();
      const equivalentState = createState({
        scheduledEvents: [
          scheduledEvent({ id: generated.record.resulting.value.id }),
        ],
      });
      const before = structuredClone(equivalentState.scheduledEvents);

      for (let attempt = 0; attempt < 2; attempt += 1) {
        expect(() => apply(createEffect(), equivalentState)).toThrow(
          InternalEffectApplicationError,
        );
        expect(equivalentState.scheduledEvents).toEqual(before);
        try {
          apply(createEffect(), equivalentState);
        } catch (error) {
          expect(error).toMatchObject({
            code: "SCHEDULED_EVENT_ID_CONFLICT",
          });
          expect(error).toHaveProperty(
            "message",
            expect.stringContaining(generated.record.resulting.value.id),
          );
        }
      }
    });
  });

  describe("audit, validation, and purity", () => {
    it.each([
      { phase: "choice" } as const,
      { phase: "outcome", outcomeId: "outcome_one" } as const,
    ])("builds a persistible applied record for $phase source", (source) => {
      const effect = createEffect({ type: "turn", afterTurns: 3 });
      const context = createContext({ source });
      const sourceBefore = structuredClone(source);
      const effectBefore = structuredClone(effect);
      const contextBefore = structuredClone(context);
      const { record, state } = apply(effect, createState(), context);

      expect(record).toMatchObject({
        type: "schedule_event",
        source,
        sourceEffectIndex: 2,
        status: "applied",
        requested: { followUp: effect.followUp },
        previous: { exists: false },
        resulting: { exists: true },
      });
      expect(record.source).not.toBe(source);
      expect(record.requested.followUp).not.toBe(effect.followUp);
      expect(record.resulting.value).not.toBe(state.scheduledEvents[0]);
      expect(record.requested.followUp.trigger).toEqual({
        type: "turn",
        afterTurns: 3,
      });
      expect(record.resulting.value).toMatchObject({
        triggerType: "turn",
        triggerValue: 3,
      });
      expect(AppliedEffectSchema.safeParse(record).success).toBe(true);
      expect(effect).toEqual(effectBefore);
      expect(context).toEqual(contextBefore);
      expect(source).toEqual(sourceBefore);
    });

    it("changes only scheduledEvents", () => {
      const state = createState();
      const before = structuredClone(state);
      apply(createEffect({ type: "age", atAge: state.life.age }), state);
      expect({ ...state, scheduledEvents: before.scheduledEvents }).toEqual(
        before,
      );
      expect(state.scheduledEvents[0]?.consumed).toBe(false);
    });

    it("rejects an invalid derived candidate before push with its cause", () => {
      const state = createState({ currentTurn: Number.MAX_SAFE_INTEGER });
      const before = structuredClone(state.scheduledEvents);
      expect(() => apply(createEffect(), state)).toThrow(
        InternalEffectApplicationError,
      );
      expect(state.scheduledEvents).toEqual(before);
      try {
        apply(createEffect(), state);
      } catch (error) {
        expect(error).toMatchObject({ code: "INVALID_INPUT" });
        expect(error).toHaveProperty("cause");
      }
    });

    it("keeps afterTurns zero invalid at the effect schema boundary", () => {
      expect(
        ScheduleEventEffectSchema.safeParse({
          type: "schedule_event",
          followUp: {
            eventId: "future_event",
            priority: 0,
            trigger: { type: "turn", afterTurns: 0 },
          },
        }).success,
      ).toBe(false);
    });
  });
});
