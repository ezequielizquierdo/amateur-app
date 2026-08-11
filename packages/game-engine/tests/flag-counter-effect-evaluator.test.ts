import {
  AppliedEffectSchema,
  type AppliedEffectSource,
  type CounterEffect,
  type FlagEffect,
  type GameState,
} from "@amateur-app/shared-types";
import { describe, expect, it } from "vitest";

import { applyFlagOrCounterEffect } from "../src/events/effects/apply-flag-or-counter-effect.js";
import { InternalEffectApplicationError } from "../src/events/effects/internal-effect-application-error.js";
import { createInitialGameState } from "../src/index.js";
import { createInput } from "./test-fixtures.js";

type SupportedEffect = FlagEffect | CounterEffect;

function validState(): GameState {
  return createInitialGameState(createInput());
}

function apply(
  effect: SupportedEffect,
  state = structuredClone(validState()),
  source: AppliedEffectSource = { phase: "choice" },
) {
  const audit = { source, sourceEffectIndex: 3 };
  const record = applyFlagOrCounterEffect(effect, state, audit);
  return { audit, record, state };
}

function expectPersistible(record: unknown): void {
  expect(AppliedEffectSchema.safeParse(record).success).toBe(true);
}

describe("applyFlagOrCounterEffect", () => {
  it.each([
    ["flag", { type: "flag", key: "__proto__", value: true }],
    [
      "counter",
      { type: "counter", key: "__proto__", operation: "set", value: 1 },
    ],
  ] as const)(
    "defensively rejects __proto__ for %s without changing state",
    (_family, unsafeEffect) => {
      const state = structuredClone(validState());
      const before = structuredClone(state);
      expect(Object.getPrototypeOf(state.history.flags)).toBe(Object.prototype);
      expect(Object.getPrototypeOf(state.history.counters)).toBe(
        Object.prototype,
      );
      let thrown: unknown;

      try {
        apply(unsafeEffect, state);
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBeInstanceOf(InternalEffectApplicationError);
      expect(thrown).toMatchObject({ code: "INVALID_INPUT" });
      expect(Object.hasOwn(state.history.flags, "__proto__")).toBe(false);
      expect(Object.hasOwn(state.history.counters, "__proto__")).toBe(false);
      expect(Object.getPrototypeOf(state.history.flags)).toBe(Object.prototype);
      expect(Object.getPrototypeOf(state.history.counters)).toBe(
        Object.prototype,
      );
      expect(state).toEqual(before);
    },
  );

  describe("flag", () => {
    it.each([[true], ["value"], [12.5], [""]] as const)(
      "creates a flag with value %s from absence",
      (value) => {
        const { record, state } = apply({ type: "flag", key: "test", value });

        expect(Object.hasOwn(state.history.flags, "test")).toBe(true);
        expect(state.history.flags.test).toBe(value);
        expect(record).toEqual({
          type: "flag",
          source: { phase: "choice" },
          sourceEffectIndex: 3,
          status: "applied",
          requested: { key: "test", value },
          previous: { exists: false },
          resulting: { exists: true, value },
        });
        expectPersistible(record);
      },
    );

    it.each([
      [false, true],
      [0, 2],
      ["old", "new"],
    ] as const)(
      "overwrites a flag while preserving its type",
      (before, value) => {
        const state = structuredClone(validState());
        state.history.flags.test = before;
        const { record } = apply({ type: "flag", key: "test", value }, state);

        expect(state.history.flags.test).toBe(value);
        expect(record.status).toBe("applied");
        expect(record.previous).toEqual({ exists: true, value: before });
        expect(record.resulting).toEqual({ exists: true, value });
        expectPersistible(record);
      },
    );

    it.each([false, 0, ""] as const)(
      "recognizes the existing falsy value %s without truthiness",
      (value) => {
        const state = structuredClone(validState());
        state.history.flags.test = value;
        const { record } = apply({ type: "flag", key: "test", value }, state);

        expect(Object.hasOwn(state.history.flags, "test")).toBe(true);
        expect(record.status).toBe("no_change");
        expect(record.previous).toEqual({ exists: true, value });
        expect(record.resulting).toEqual({ exists: true, value });
      },
    );

    it.each([
      [false, "false"],
      [0, "0"],
      ["", false],
    ] as const)(
      "rejects a type change from %s to %s without writing",
      (before, value) => {
        const state = structuredClone(validState());
        state.history.flags.test = before;
        const flagsBefore = structuredClone(state.history.flags);

        expect(() =>
          apply({ type: "flag", key: "test", value }, state),
        ).toThrow(InternalEffectApplicationError);
        expect(state.history.flags).toEqual(flagsBefore);

        try {
          apply({ type: "flag", key: "test", value }, state);
        } catch (error) {
          expect(error).toMatchObject({ code: "INVALID_INPUT" });
          expect(error).toHaveProperty(
            "message",
            expect.stringContaining("flag.test"),
          );
        }
      },
    );

    it.each([
      { phase: "choice" } as const,
      { phase: "outcome", outcomeId: "outcome_1" } as const,
    ])("copies source and requested for $phase", (source) => {
      const effect: FlagEffect = {
        type: "flag",
        key: "exact_value",
        value: -0,
      };
      const effectBefore = structuredClone(effect);
      const sourceBefore = structuredClone(source);
      const { audit, record } = apply(effect, undefined, source);

      expect(record.requested).toEqual({ key: "exact_value", value: -0 });
      expect(record.source).toEqual(source);
      expect(record.source).not.toBe(source);
      expect(record.sourceEffectIndex).toBe(3);
      expect(effect).toEqual(effectBefore);
      expect(source).toEqual(sourceBefore);
      expect(audit.source).toBe(source);
      expectPersistible(record);
    });

    it("changes only history.flags", () => {
      const state = structuredClone(validState());
      const before = structuredClone(state);
      apply({ type: "flag", key: "test", value: true }, state);

      expect(state).toEqual({
        ...before,
        history: {
          ...before.history,
          flags: { test: true },
        },
      });
    });
  });

  describe("counter", () => {
    it("creates an absent counter when setting zero", () => {
      const { record, state } = apply({
        type: "counter",
        key: "test",
        operation: "set",
        value: 0,
      });

      expect(Object.hasOwn(state.history.counters, "test")).toBe(true);
      expect(state.history.counters.test).toBe(0);
      expect(record).toMatchObject({
        status: "applied",
        previous: { exists: false },
        resulting: { exists: true, value: 0 },
      });
      expectPersistible(record);
    });

    it("creates an absent counter when setting a positive value", () => {
      const { record, state } = apply({
        type: "counter",
        key: "test",
        operation: "set",
        value: 4,
      });
      expect(state.history.counters.test).toBe(4);
      expect(record.status).toBe("applied");
      expectPersistible(record);
    });

    it.each([
      [4, 4, "no_change"],
      [4, 7, "applied"],
    ] as const)(
      "sets an existing counter from %s to %s",
      (before, value, status) => {
        const state = structuredClone(validState());
        state.history.counters.test = before;
        const { record } = apply(
          { type: "counter", key: "test", operation: "set", value },
          state,
        );
        expect(state.history.counters.test).toBe(value);
        expect(record.status).toBe(status);
        expect(record.previous).toEqual({ exists: true, value: before });
        expect(record.resulting).toEqual({ exists: true, value });
      },
    );

    it.each([
      [0, false, undefined, "no_change"],
      [-3, false, undefined, "no_change"],
      [3, true, 3, "applied"],
    ] as const)(
      "increments an absent counter by %s",
      (value, expectedExists, expectedValue, status) => {
        const { record, state } = apply({
          type: "counter",
          key: "test",
          operation: "increment",
          value,
        });

        expect(Object.hasOwn(state.history.counters, "test")).toBe(
          expectedExists,
        );
        expect(state.history.counters.test).toBe(expectedValue);
        expect(record.status).toBe(status);
        expect(record.previous).toEqual({ exists: false });
        expect(record.resulting).toEqual(
          expectedExists
            ? { exists: true, value: expectedValue }
            : { exists: false },
        );
        expectPersistible(record);
      },
    );

    it.each([
      [5, 2, 7, "applied"],
      [5, -2, 3, "applied"],
      [5, -10, 0, "applied"],
      [0, -1, 0, "no_change"],
      [0, 0, 0, "no_change"],
    ] as const)(
      "increments an existing counter from %s by %s",
      (before, value, expected, status) => {
        const state = structuredClone(validState());
        state.history.counters.test = before;
        const { record } = apply(
          { type: "counter", key: "test", operation: "increment", value },
          state,
        );

        expect(Object.hasOwn(state.history.counters, "test")).toBe(true);
        expect(state.history.counters.test).toBe(expected);
        expect(record.status).toBe(status);
        expect(record.previous).toEqual({ exists: true, value: before });
        expect(record.resulting).toEqual({ exists: true, value: expected });
        expectPersistible(record);
      },
    );

    it("rejects safe integer overflow before writing", () => {
      const state = structuredClone(validState());
      state.history.counters.test = Number.MAX_SAFE_INTEGER;
      const before = structuredClone(state);
      const effect: CounterEffect = {
        type: "counter",
        key: "test",
        operation: "increment",
        value: 1,
      };

      expect(() => apply(effect, state)).toThrow(
        InternalEffectApplicationError,
      );
      expect(state).toEqual(before);
      try {
        apply(effect, state);
      } catch (error) {
        expect(error).toMatchObject({ code: "INVALID_NUMERIC_RESULT" });
        expect(error).toHaveProperty(
          "message",
          expect.stringContaining("counter.test"),
        );
      }
    });

    it.each([1.5, -1])(
      "rejects the invalid existing counter %s before writing",
      (existing) => {
        const state = structuredClone(validState());
        state.history.counters.test = existing;
        const before = structuredClone(state);
        let thrown: unknown;

        try {
          apply(
            {
              type: "counter",
              key: "test",
              operation: "increment",
              value: 1,
            },
            state,
          );
        } catch (error) {
          thrown = error;
        }

        expect(thrown).toBeInstanceOf(InternalEffectApplicationError);
        expect(thrown).toMatchObject({ code: "INVALID_NUMERIC_RESULT" });
        expect(state).toEqual(before);
      },
    );

    it.each([
      { phase: "choice" } as const,
      { phase: "outcome", outcomeId: "outcome_1" } as const,
    ])("copies source and requested for $phase", (source) => {
      const effect: CounterEffect = {
        type: "counter",
        key: "exact_value",
        operation: "increment",
        value: -0,
      };
      const effectBefore = structuredClone(effect);
      const sourceBefore = structuredClone(source);
      const { audit, record } = apply(effect, undefined, source);

      expect(record.requested).toEqual({
        key: "exact_value",
        operation: "increment",
        value: -0,
      });
      expect(record.source).toEqual(source);
      expect(record.source).not.toBe(source);
      expect(record.sourceEffectIndex).toBe(3);
      expect(effect).toEqual(effectBefore);
      expect(source).toEqual(sourceBefore);
      expect(audit.source).toBe(source);
      expectPersistible(record);
    });

    it("changes only history.counters", () => {
      const state = structuredClone(validState());
      const before = structuredClone(state);
      apply(
        { type: "counter", key: "test", operation: "increment", value: 2 },
        state,
      );

      expect(state).toEqual({
        ...before,
        history: {
          ...before.history,
          counters: { test: 2 },
        },
      });
    });

    it("is deterministic across independent working states", () => {
      const effect: CounterEffect = {
        type: "counter",
        key: "test",
        operation: "increment",
        value: 2,
      };
      const first = apply(effect);
      const second = apply(effect);
      expect(first.state).toEqual(second.state);
      expect(first.record).toEqual(second.record);
    });
  });
});
