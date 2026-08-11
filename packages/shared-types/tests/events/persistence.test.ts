import { describe, expect, it } from "vitest";
import { ZodError } from "zod";

import { DecisionRecordSchema, ScheduledEventSchema } from "../../src/index.js";

describe("event persistence contracts", () => {
  const decision = {
    eventId: "first_trial",
    eventVersion: 1,
    choiceId: "attend_trial",
    outcomeId: "accepted",
    age: 14,
    season: 1,
    turn: 0,
    immediateEffects: [],
  };

  it("accepts a decision with an event version and optional outcome", () => {
    expect(DecisionRecordSchema.safeParse(decision).success).toBe(true);
    const withoutOutcome: Record<string, unknown> = { ...decision };
    delete withoutOutcome.outcomeId;
    expect(DecisionRecordSchema.safeParse(withoutOutcome).success).toBe(true);
  });

  it("rejects a decision without eventVersion", () => {
    const withoutVersion: Record<string, unknown> = { ...decision };
    delete withoutVersion.eventVersion;
    expect(DecisionRecordSchema.safeParse(withoutVersion).success).toBe(false);
  });

  it("hardens DecisionRecord as an independent persistibility boundary", () => {
    const withSymbol = { ...decision, [Symbol("hidden")]: true };
    const withAccessor = { ...decision };
    const withHidden = { ...decision };
    Object.defineProperty(withHidden, "hidden", {
      enumerable: false,
      value: true,
    });
    const withSparseArray = { ...decision, immediateEffects: new Array(2) };
    const withPrototype = { ...decision };
    Object.setPrototypeOf(withPrototype, { custom: true });
    const withCycle: Record<string, unknown> = { ...decision };
    withCycle.circular = withCycle;
    let getterCalls = 0;
    Object.defineProperty(withAccessor, "eventId", {
      enumerable: true,
      get() {
        getterCalls += 1;
        throw new Error("boom");
      },
    });

    expect(DecisionRecordSchema.safeParse(withSymbol).success).toBe(false);
    expect(DecisionRecordSchema.safeParse(withHidden).success).toBe(false);
    expect(DecisionRecordSchema.safeParse(withSparseArray).success).toBe(false);
    expect(DecisionRecordSchema.safeParse(withPrototype).success).toBe(false);
    expect(DecisionRecordSchema.safeParse(withCycle).success).toBe(false);
    expect(() => DecisionRecordSchema.safeParse(withAccessor)).not.toThrow();
    expect(DecisionRecordSchema.safeParse(withAccessor).success).toBe(false);
    expect(getterCalls).toBe(0);
    expect(() => DecisionRecordSchema.parse(withAccessor)).toThrow(ZodError);
    expect(getterCalls).toBe(0);
  });

  it.each([
    { triggerType: "turn", triggerValue: 3 },
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
  ])("accepts a valid absolute scheduled event variant", (trigger) => {
    expect(
      ScheduledEventSchema.safeParse({
        id: "scheduled-1",
        eventId: "next_event",
        sourceEventId: "first_event",
        priority: 1,
        createdAtTurn: 0,
        consumed: false,
        ...trigger,
      }).success,
    ).toBe(true);
  });

  it.each([
    {
      triggerType: "turn",
      triggerValue: 3,
      conditions: { mode: "all", conditions: [] },
    },
    {
      triggerType: "condition",
      triggerValue: 3,
      conditions: { mode: "all", conditions: [] },
    },
    { triggerType: "condition" },
  ])("rejects incompatible scheduled event fields", (trigger) => {
    expect(
      ScheduledEventSchema.safeParse({
        id: "scheduled-1",
        eventId: "next_event",
        sourceEventId: "first_event",
        priority: 1,
        createdAtTurn: 0,
        consumed: false,
        ...trigger,
      }).success,
    ).toBe(false);
  });

  it("hardens ScheduledEvent as an independent persistibility boundary", () => {
    const scheduled = {
      id: "scheduled-1",
      eventId: "next_event",
      sourceEventId: "first_event",
      priority: 1,
      createdAtTurn: 0,
      consumed: false,
      triggerType: "turn",
      triggerValue: 3,
    };
    const withSymbol = { ...scheduled, [Symbol("hidden")]: true };
    const withHidden = { ...scheduled };
    Object.defineProperty(withHidden, "hidden", {
      enumerable: false,
      value: true,
    });
    const withPrototype = { ...scheduled };
    Object.setPrototypeOf(withPrototype, { custom: true });
    const withCycle: Record<string, unknown> = { ...scheduled };
    withCycle.circular = withCycle;
    const withSparseConditions = {
      ...scheduled,
      triggerType: "condition",
      triggerValue: undefined,
      conditions: { mode: "all", conditions: new Array(2) },
    };
    delete (withSparseConditions as { triggerValue?: unknown }).triggerValue;

    expect(ScheduledEventSchema.safeParse(withSymbol).success).toBe(false);
    expect(ScheduledEventSchema.safeParse(withHidden).success).toBe(false);
    expect(ScheduledEventSchema.safeParse(withPrototype).success).toBe(false);
    expect(ScheduledEventSchema.safeParse(withCycle).success).toBe(false);
    expect(ScheduledEventSchema.safeParse(withSparseConditions).success).toBe(
      false,
    );
  });
});
