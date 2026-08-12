import type {
  EventConditionGroup,
  GameState,
  ProbabilisticOutcome,
} from "@amateur-app/shared-types";
import { describe, expect, expectTypeOf, it, vi } from "vitest";

import * as gameEngine from "../src/index.js";
import {
  createInitialGameState,
  OutcomeSelectionError,
  selectDeterministicOutcome,
  type OutcomeSelectionContext,
  type OutcomeSelectionErrorCode,
} from "../src/index.js";
import { createInput } from "./test-fixtures.js";

const context: OutcomeSelectionContext = {
  sourceEventId: "academy_trial",
  sourceEventVersion: 1,
  choiceId: "accept_trial",
};

function createState(
  overrides: Parameters<typeof createInput>[0] = {},
): GameState {
  return createInitialGameState(createInput(overrides));
}

function outcome(
  id: string,
  weight: number,
  overrides: Partial<ProbabilisticOutcome> = {},
): ProbabilisticOutcome {
  return {
    id,
    weight,
    effects: [{ type: "flag", key: `selected_${id}`, value: true }],
    ...overrides,
  };
}

function selectRuntime(
  outcomes: unknown,
  state: unknown = createState(),
  selectionContext: unknown = context,
): unknown {
  return Reflect.apply(selectDeterministicOutcome, undefined, [
    outcomes,
    state,
    selectionContext,
  ]);
}

function captureError(action: () => unknown): unknown {
  try {
    action();
  } catch (error) {
    return error;
  }
  throw new Error("Expected action to throw");
}

function expectSelectionError(
  action: () => unknown,
  code: OutcomeSelectionErrorCode,
): OutcomeSelectionError {
  const error = captureError(action);
  expect(error).toBeInstanceOf(OutcomeSelectionError);
  expect(error).toMatchObject({ code });
  if (!(error instanceof OutcomeSelectionError)) {
    throw new Error("Expected OutcomeSelectionError");
  }
  return error;
}

describe("deterministic outcome selection", () => {
  describe("public API", () => {
    it("exports only the intended outcome-selection surface", () => {
      expect(gameEngine.selectDeterministicOutcome).toBeTypeOf("function");
      expect(gameEngine.OutcomeSelectionError).toBe(OutcomeSelectionError);
      expectTypeOf<OutcomeSelectionContext>().toEqualTypeOf<
        Readonly<{
          sourceEventId: string;
          sourceEventVersion: number;
          choiceId: string;
        }>
      >();
      expectTypeOf<OutcomeSelectionErrorCode>().toEqualTypeOf<
        "INVALID_INPUT" | "NO_ELIGIBLE_OUTCOME"
      >();
    });
  });

  describe("validation", () => {
    it.each([
      ["empty array", []],
      ["malformed outcome", [{ id: "bad", weight: 1, effects: [] }]],
      ["zero weight", [outcome("bad", 0)]],
      ["negative weight", [outcome("bad", -1)]],
      ["fractional weight", [outcome("bad", 1.5)]],
      ["NaN weight", [outcome("bad", Number.NaN)]],
      ["infinite weight", [outcome("bad", Number.POSITIVE_INFINITY)]],
      ["unsafe weight", [outcome("bad", Number.MAX_SAFE_INTEGER + 1)]],
    ])("rejects %s", (_label, invalidOutcomes) => {
      expectSelectionError(
        () => selectRuntime(invalidOutcomes),
        "INVALID_INPUT",
      );
    });

    it("reports the repeated outcome ID and index", () => {
      const error = expectSelectionError(
        () =>
          selectDeterministicOutcome(
            [outcome("duplicate", 1), outcome("duplicate", 2)],
            createState(),
            context,
          ),
        "INVALID_INPUT",
      );
      expect(error).toMatchObject({
        outcomeIndex: 1,
        outcomeId: "duplicate",
      });
    });

    it("rejects an invalid GameState", () => {
      const state = { ...createState(), currentTurn: -1 };
      expectSelectionError(
        () => selectRuntime([outcome("valid", 1)], state),
        "INVALID_INPUT",
      );
    });

    it.each([
      ["invalid event ID", { ...context, sourceEventId: "Invalid ID" }],
      ["zero version", { ...context, sourceEventVersion: 0 }],
      ["unsafe version", { ...context, sourceEventVersion: 2 ** 53 }],
      ["invalid choice ID", { ...context, choiceId: "Invalid ID" }],
      ["extra property", { ...context, extra: true }],
    ])("rejects context with %s", (_label, invalidContext) => {
      expectSelectionError(
        () =>
          selectRuntime([outcome("valid", 1)], createState(), invalidContext),
        "INVALID_INPUT",
      );
    });

    it("rejects symbol context keys", () => {
      const invalidContext = { ...context, [Symbol("extra")]: true };
      expectSelectionError(
        () =>
          selectRuntime([outcome("valid", 1)], createState(), invalidContext),
        "INVALID_INPUT",
      );
    });

    it("rejects invalid availability rather than treating it as false", () => {
      const invalid = {
        ...outcome("invalid_availability", 1),
        availability: { mode: "all", conditions: [] },
      };
      const error = expectSelectionError(
        () => selectRuntime([invalid]),
        "INVALID_INPUT",
      );
      expect(error.outcomeIndex).toBe(0);
      expect(error.outcomeId).toBe("invalid_availability");
    });
  });

  describe("eligibility", () => {
    const trueCondition = {
      mode: "all",
      conditions: [
        {
          type: "state",
          field: "stats.mood",
          operator: "greaterThanOrEqual",
          value: 60,
        },
      ],
    } satisfies EventConditionGroup;
    const falseCondition = {
      mode: "any",
      conditions: [
        {
          type: "state",
          field: "stats.mood",
          operator: "lessThan",
          value: 0,
        },
      ],
      negate: false,
    } satisfies EventConditionGroup;

    it("accepts no availability and true availability", () => {
      const outcomes = [
        outcome("unconditional", 1),
        outcome("conditional", 1, { availability: trueCondition }),
      ];
      expect(() =>
        selectDeterministicOutcome(outcomes, createState(), context),
      ).not.toThrow();
    });

    it("filters false availability while preserving the eligible outcome", () => {
      const selected = selectDeterministicOutcome(
        [
          outcome("filtered", 10, { availability: falseCondition }),
          outcome("available", 1),
        ],
        createState(),
        context,
      );
      expect(selected.id).toBe("available");
    });

    it("supports all, any and negate through the existing evaluator", () => {
      const selected = selectDeterministicOutcome(
        [
          outcome("all_false", 1, { availability: falseCondition }),
          outcome("negated_any", 1, {
            availability: { ...falseCondition, negate: true },
          }),
        ],
        createState(),
        context,
      );
      expect(selected.id).toBe("negated_any");
    });

    it("throws when no outcome is eligible", () => {
      const state = createState();
      const outcomes = [
        outcome("first", 1, { availability: falseCondition }),
        outcome("second", 1, { availability: falseCondition }),
      ];
      const beforeState = structuredClone(state);
      const beforeOutcomes = structuredClone(outcomes);
      const error = expectSelectionError(
        () => selectDeterministicOutcome(outcomes, state, context),
        "NO_ELIGIBLE_OUTCOME",
      );
      expect(error).not.toHaveProperty("outcomeIndex");
      expect(state).toEqual(beforeState);
      expect(outcomes).toEqual(beforeOutcomes);
    });

    it("uses exactly the state received, matching the future post-choice contract", () => {
      const availability = {
        mode: "all",
        conditions: [
          {
            type: "state",
            field: "stats.mood",
            operator: "greaterThanOrEqual",
            value: 70,
          },
        ],
      } satisfies EventConditionGroup;
      const candidate = outcome("post_choice_only", 1, { availability });
      const beforeChoice = createState();
      const afterChoice = {
        ...beforeChoice,
        stats: { ...beforeChoice.stats, mood: 70 },
      };
      expectSelectionError(
        () => selectDeterministicOutcome([candidate], beforeChoice, context),
        "NO_ELIGIBLE_OUTCOME",
      );
      expect(
        selectDeterministicOutcome([candidate], afterChoice, context).id,
      ).toBe("post_choice_only");
    });
  });

  describe("determinism and weighted selection", () => {
    const weighted = [
      outcome("sixty", 60),
      outcome("thirty", 30),
      outcome("ten", 10),
    ];

    it.each([
      ["seed-1", "sixty"],
      ["alpha", "thirty"],
      ["seed-2", "ten"],
    ] as const)(
      "freezes ASCII 60/30/10 golden vector for seed %s",
      (seed, expected) => {
        expect(
          selectDeterministicOutcome(weighted, createState({ seed }), context)
            .id,
        ).toBe(expected);
      },
    );

    it("freezes a Unicode length-prefix golden vector", () => {
      const state = createState({ seed: "semilla-⚽️", runId: "partida-ñ" });
      expect(selectDeterministicOutcome(weighted, state, context).id).toBe(
        "sixty",
      );
    });

    it("repeats exactly and gives equivalent clones the same outcome", () => {
      const state = createState();
      const expected = selectDeterministicOutcome(weighted, state, context).id;
      for (let iteration = 0; iteration < 50; iteration += 1) {
        expect(
          selectDeterministicOutcome(
            structuredClone(weighted),
            structuredClone(state),
            structuredClone(context),
          ).id,
        ).toBe(expected);
      }
    });

    it("does not consult Math.random", () => {
      const random = vi.spyOn(Math, "random").mockImplementation(() => {
        throw new Error("Math.random must not be called");
      });
      expect(
        selectDeterministicOutcome(weighted, createState(), context).id,
      ).toBe("sixty");
      expect(random).not.toHaveBeenCalled();
      random.mockRestore();
    });

    it("is exactly invariant to proportional weight scaling", () => {
      const state = createState();
      const small = [outcome("first", 1), outcome("second", 1)];
      const scaled = [outcome("first", 50), outcome("second", 50)];
      expect(selectDeterministicOutcome(small, state, context).id).toBe(
        selectDeterministicOutcome(scaled, state, context).id,
      );
    });

    it("supports an eligible total greater than Number.MAX_SAFE_INTEGER", () => {
      const large = [
        outcome("large_first", Number.MAX_SAFE_INTEGER),
        outcome("large_second", Number.MAX_SAFE_INTEGER),
      ];
      expect(selectDeterministicOutcome(large, createState(), context).id).toBe(
        "large_first",
      );
    });

    it("freezes filtering before weighted selection", () => {
      const filtered = outcome("filtered", Number.MAX_SAFE_INTEGER, {
        availability: {
          mode: "all",
          conditions: [
            {
              type: "state",
              field: "currentTurn",
              operator: "lessThan",
              value: 0,
            },
          ],
        },
      });
      expect(
        selectDeterministicOutcome(
          [filtered, ...weighted],
          createState(),
          context,
        ).id,
      ).toBe("sixty");
    });

    it("treats array order as part of versioned content", () => {
      const original = selectDeterministicOutcome(
        [outcome("first", 1), outcome("second", 1)],
        createState(),
        context,
      );
      const reordered = selectDeterministicOutcome(
        [outcome("second", 1), outcome("first", 1)],
        createState(),
        context,
      );
      expect(original.id).not.toBe(reordered.id);
    });

    it("does not include effects or follow-ups in the draw namespace", () => {
      const state = createState();
      const baseline = [outcome("first", 1), outcome("second", 1)];
      const changedPayloads = [
        outcome("first", 1, {
          effects: [{ type: "flag", key: "different_effect", value: 99 }],
          followUps: [
            {
              eventId: "future_event",
              trigger: { type: "turn", afterTurns: 2 },
              priority: 10,
            },
          ],
        }),
        outcome("second", 1, {
          effects: [
            {
              type: "counter",
              key: "different_counter",
              operation: "set",
              value: 4,
            },
          ],
        }),
      ];
      expect(selectDeterministicOutcome(baseline, state, context).id).toBe(
        selectDeterministicOutcome(changedPayloads, state, context).id,
      );
      expect(state.history.flags).toEqual({});
      expect(state.history.counters).toEqual({});
      expect(state.scheduledEvents).toEqual([]);
    });

    it("uses eventVersion in the deterministic namespace", () => {
      const first = selectDeterministicOutcome(weighted, createState(), {
        ...context,
        sourceEventVersion: 1,
      });
      const second = selectDeterministicOutcome(weighted, createState(), {
        ...context,
        sourceEventVersion: 3,
      });
      expect([first.id, second.id]).toEqual(["sixty", "thirty"]);
    });

    it("freezes differentiation vectors for every namespace component", () => {
      const granular = Array.from({ length: 100 }, (_value, index) =>
        outcome(`outcome_${index}`, 1),
      );
      const baseState = createState();
      const vectors = [
        ["baseline", baseState, context, "outcome_1"],
        ["seed", createState({ seed: "seed-2" }), context, "outcome_93"],
        ["runId", createState({ runId: "x" }), context, "outcome_95"],
        [
          "currentTurn",
          { ...baseState, currentTurn: 1 },
          context,
          "outcome_67",
        ],
        [
          "eventId",
          baseState,
          { ...context, sourceEventId: "event_6" },
          "outcome_86",
        ],
        [
          "eventVersion",
          baseState,
          { ...context, sourceEventVersion: 3 },
          "outcome_83",
        ],
        [
          "choiceId",
          baseState,
          { ...context, choiceId: "other_choice" },
          "outcome_75",
        ],
      ] as const;

      for (const [component, state, selectionContext, expected] of vectors) {
        expect(
          selectDeterministicOutcome(granular, state, selectionContext).id,
          component,
        ).toBe(expected);
      }
    });
  });

  it("does not mutate outcomes, state or context", () => {
    const state = createState();
    const outcomes = [outcome("first", 1), outcome("second", 2)];
    const selectionContext = { ...context };
    const before = structuredClone({ state, outcomes, selectionContext });
    selectDeterministicOutcome(outcomes, state, selectionContext);
    expect({ state, outcomes, selectionContext }).toEqual(before);
  });
});
